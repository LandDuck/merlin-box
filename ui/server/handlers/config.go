/*
 * # merlin-box - A sing-box + smartdns routing and proxy script solution for ASUSWRT-Merlin routers.
 * # Copyright (C) 2026 LandDuck <https://github.com/LandDuck/>
 * #
 * # This program is free software: you can redistribute it and/or modify
 * # it under the terms of the GNU General Public License as published by
 * # the Free Software Foundation, either version 3 of the License, or
 * # (at your option) any later version.
 * #
 * # This program is distributed in the hope that it will be useful,
 * # but WITHOUT ANY WARRANTY; without even the implied warranty of
 * # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * # GNU General Public License for more details.
 * #
 * # You should have received a copy of the GNU General Public License
 * # along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

package handlers

import (
	"fmt"
	"merlin-box-ui/global"
	dbHelper "merlin-box-ui/helper/db"
	httpHelper "merlin-box-ui/helper/http"
	validateHelper "merlin-box-ui/helper/validate"
	dbModel "merlin-box-ui/model/db"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// GetBaseConfig 获取基础配置
func GetBaseConfig(w http.ResponseWriter, r *http.Request) {
	config, err := dbHelper.GetBaseConfig()
	if err != nil {
		httpHelper.ResponseFailure(w, "读取基础配置失败")
		return
	}
	httpHelper.ResponseSuccess(w, config)
}

// SaveBaseConfig 保存基础配置
func SaveBaseConfig(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[dbModel.BaseConfigFull](w, r)
	if !ok {
		return
	}

	// 验证大陆DNS不能配置相同的值
	if len(requestData.DnsChina) == 2 && requestData.DnsChina[0] == requestData.DnsChina[1] {
		httpHelper.ResponseFailure(w, "大陆DNS不能配置相同的地址")
		return
	}

	// 验证国际DNS不能配置相同的值
	if len(requestData.DnsForeign) == 2 && requestData.DnsForeign[0] == requestData.DnsForeign[1] {
		httpHelper.ResponseFailure(w, "国际DNS不能配置相同的地址")
		return
	}

	if err := dbHelper.SaveBaseConfig(requestData); err != nil {
		httpHelper.ResponseFailure(w, "保存基础配置失败")
		return
	}

	if err := updateSmartDNSConfig(requestData); err != nil {
		httpHelper.ResponseFailure(w, "更新 smartdns.conf 失败")
		return
	}

	httpHelper.ResponseSuccess(w, "保存成功")
}

func updateSmartDNSConfig(config dbModel.BaseConfigFull) error {
	if len(config.DnsChina) != 2 || len(config.DnsForeign) != 2 {
		return fmt.Errorf("invalid dns count")
	}

	confPath := filepath.Join(global.ConfDir, "smartdns.conf")
	contentBytes, err := os.ReadFile(confPath)
	if err != nil {
		return err
	}
	content := string(contentBytes)

	beginMarker := "# ====dns begin===="
	endMarker := "# ====dns end===="
	beginIndex := strings.Index(content, beginMarker)
	endIndex := strings.Index(content, endMarker)
	if beginIndex < 0 || endIndex < 0 || beginIndex >= endIndex {
		return fmt.Errorf("dns markers not found")
	}

	dnsBlock := buildSmartDNSBlock(config)
	replaced := content[:beginIndex+len(beginMarker)] + "\n" + dnsBlock + "\n" + content[endIndex:]
	return os.WriteFile(confPath, []byte(replaced), 0o644)
}

func buildSmartDNSBlock(config dbModel.BaseConfigFull) string {
	var builder strings.Builder
	builder.WriteString("# china dns 1\n")
	builder.WriteString("server ")
	builder.WriteString(config.DnsChina[0])
	builder.WriteString(" -g china -exclude-from-default-group\n")
	builder.WriteString("# china dns 2\n")
	builder.WriteString("server ")
	builder.WriteString(config.DnsChina[1])
	builder.WriteString(" -g china -exclude-from-default-group\n\n")
	builder.WriteString("# foreign dns 1\n")
	builder.WriteString(buildForeignDNSServerLine(config.DnsForeign[0]))
	builder.WriteString("\n")
	builder.WriteString("# foreign dns 2\n")
	builder.WriteString(buildForeignDNSServerLine(config.DnsForeign[1]))
	return builder.String()
}

func buildForeignDNSServerLine(dns string) string {
	if strings.HasPrefix(dns, "https://") || strings.HasPrefix(dns, "http://") {
		return "server-https " + dns + " -proxy socks5 -group foreign"
	}
	return "server " + dns + " -proxy socks5 -group foreign"
}
