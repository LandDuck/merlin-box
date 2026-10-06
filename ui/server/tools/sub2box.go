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

package tools

import (
	"regexp"

	logger "github.com/LandDuck/merlin-box/helper/log"

	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// buildTransport
func buildTransport(transportType, host, path string) map[string]any {
	switch transportType {
	case "ws":
		return map[string]any{
			"type": "ws",
			"path": path,
		}
	case "grpc":
		return map[string]any{
			"type":         "grpc",
			"service_name": host,
		}
	case "http":
		return map[string]any{
			"type": "http",
			"path": path,
			"host": host,
		}
	case "quic":
		return map[string]any{
			"type": "quic",
		}
	case "httpupgrade":
		return map[string]any{
			"type": "http_upgrade",
			"path": path,
			"host": host,
		}
	}
	return map[string]any{
		"type": "",
	}
}

// parseSS 解析 ss:// URI 并转换为 sing-box 的 shadowsocks outbound。
func parseSS(uri string) map[string]any {
	raw := uri
	defer func() {
		if recover() != nil {
			logger.Warn("跳过无法解析的 Shadowsocks URI: " + raw)
		}
	}()

	uri = strings.TrimPrefix(uri, "ss://")
	name := ""
	if idx := strings.LastIndex(uri, "#"); idx >= 0 {
		name, _ = url.QueryUnescape(uri[idx+1:])
		uri = uri[:idx]
	}

	if !strings.Contains(uri, "@") {
		logger.Warn("跳过无法解析的 Shadowsocks URI: " + uri)
		return nil
	}

	parts := strings.SplitN(uri, "@", 2)
	userinfo := parts[0]
	serverPart := parts[1]
	i := strings.LastIndex(serverPart, ":")
	if i <= 0 || i == len(serverPart)-1 {
		logger.Warn("跳过无法解析的 Shadowsocks URI: " + raw)
		return nil
	}
	server := serverPart[:i]
	port, err := strconv.Atoi(serverPart[i+1:])
	if err != nil {
		logger.Warn("跳过无法解析的 Shadowsocks URI: " + raw)
		return nil
	}

	if isLocalIP(server) {
		nodeName := name
		if nodeName == "" {
			nodeName = fmt.Sprintf("%s:%d", server, port)
		}
		logger.Warn(fmt.Sprintf("跳过本地 IP 节点: %s (%s)", nodeName, server))
		return nil
	}

	var method, password string
	if decoded, err := base64.RawURLEncoding.DecodeString(userinfo); err == nil && strings.Contains(string(decoded), ":") {
		mp := strings.SplitN(string(decoded), ":", 2)
		method, password = mp[0], mp[1]
	} else if decoded, err := base64.URLEncoding.DecodeString(userinfo); err == nil && strings.Contains(string(decoded), ":") {
		mp := strings.SplitN(string(decoded), ":", 2)
		method, password = mp[0], mp[1]
	} else {
		mp := strings.SplitN(userinfo, ":", 2)
		if len(mp) != 2 {
			logger.Warn("跳过无法解析的 Shadowsocks URI: " + raw)
			return nil
		}
		method, password = mp[0], mp[1]
	}

	tag := name
	if tag == "" {
		tag = fmt.Sprintf("ss-%s:%d", server, port)
	}
	return map[string]any{
		"type":        "shadowsocks",
		"tag":         tag,
		"server":      server,
		"server_port": port,
		"method":      method,
		"password":    password,
	}
}

// parseVMess 解析 vmess:// URI 并转换为 sing-box 的 vmess outbound。
func parseVMess(uri string) map[string]any {
	raw := uri
	b64 := strings.TrimPrefix(uri, "vmess://")
	if m := len(b64) % 4; m != 0 {
		b64 += strings.Repeat("=", 4-m)
	}
	decoded, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		logger.Warn("跳过无法解析的 VMess URI: " + raw)
		return nil
	}

	var data map[string]any
	if err := json.Unmarshal(decoded, &data); err != nil {
		logger.Warn("跳过无法解析的 VMess URI: " + raw)
		return nil
	}

	server := asString(data["add"])
	if server == "" {
		logger.Warn("跳过无法解析的 VMess URI: " + raw)
		return nil
	}
	if isLocalIP(server) {
		name := asString(data["ps"])
		if name == "" {
			name = server
		}
		logger.Warn(fmt.Sprintf("跳过本地 IP 节点: %s (%s)", name, server))
		return nil
	}

	port, err := toInt(data["port"])
	if err != nil {
		logger.Warn("跳过无法解析的 VMess URI: " + raw)
		return nil
	}
	tag := asString(data["ps"])
	if tag == "" {
		tag = "vmess-" + server
	}
	outbound := map[string]any{
		"type":        "vmess",
		"tag":         tag,
		"server":      server,
		"server_port": port,
		"uuid":        asString(data["id"]),
		"security":    withDefault(asString(data["scy"]), "auto"),
		"alter_id":    mustIntDefault(data["aid"], 0),
	}

	if asString(data["tls"]) == "tls" {
		serverName := withDefault(asString(data["sni"]), withDefault(asString(data["host"]), server))
		outbound["tls"] = map[string]any{
			"enabled":     true,
			"server_name": serverName,
		}
	}

	var transportType string
	if net := asString(data["net"]); net != "" {
		transportType = net
	} else if tp := asString(data["type"]); tp != "" {
		transportType = tp
	}
	if transportType == "xhttp" {
		logger.Warn("跳过不支持的 VMess xhttp 传输类型: " + raw)
		return nil
	}
	var path = withDefault(asString(data["path"]), "/")
	var host = asString(data["host"])

	transport := buildTransport(transportType, host, path)
	if transport != nil {
		outbound["transport"] = transport
	}

	return outbound
}

// parseTrojan 解析 trojan:// URI 并转换为 sing-box 的 trojan outbound。
func parseTrojan(uri string) map[string]any {
	u, err := url.Parse(uri)
	if err != nil {
		logger.Warn("跳过无法解析的 Trojan URI: " + uri)
		return nil
	}
	password := ""
	if u.User != nil {
		password = u.User.Username()
	}
	server := u.Hostname()
	if server == "" {
		logger.Warn("跳过无法解析的 Trojan URI: " + uri)
		return nil
	}
	port := 443
	if p := u.Port(); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}
	name := u.Fragment
	if decoded, err := url.QueryUnescape(name); err == nil {
		name = decoded
	}
	if name == "" {
		name = "trojan-" + server
	}
	if isLocalIP(server) {
		logger.Warn(fmt.Sprintf("跳过本地 IP 节点: %s (%s)", name, server))
		return nil
	}
	sni := u.Query().Get("sni")
	if sni == "" {
		sni = server
	}
	query := u.Query()
	transportType := withDefault(query.Get("type"), "")
	if transportType == "xhttp" {
		logger.Warn("跳过不支持的 Trojan xhttp 传输类型: " + uri)
		return nil
	}
	host := query.Get("host")
	path := withDefault(query.Get("path"), "/")

	outbound := map[string]any{
		"type":        "trojan",
		"tag":         name,
		"server":      server,
		"server_port": port,
		"password":    password,
		"tls": map[string]any{
			"enabled":     true,
			"server_name": sni,
		},
	}
	if transport := buildTransport(transportType, host, path); transport != nil {
		outbound["transport"] = transport
	}
	return outbound
}

// parseVLess 解析 vless:// URI 并转换为 sing-box 的 vless outbound。
func parseVLess(uri string) map[string]any {
	u, err := url.Parse(uri)
	if err != nil {
		logger.Warn("跳过无法解析的 Vless URI: " + uri)
		return nil
	}
	uuid := ""
	if u.User != nil {
		uuid = u.User.Username()
	}
	server := u.Hostname()
	if server == "" {
		logger.Warn("跳过无法解析的 Vless URI: " + uri)
		return nil
	}
	port := 443
	if p := u.Port(); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}
	name := u.Fragment
	if decoded, err := url.QueryUnescape(name); err == nil {
		name = decoded
	}
	if name == "" {
		name = "vless-" + server
	}
	if isLocalIP(server) {
		logger.Warn(fmt.Sprintf("跳过本地 IP 节点: %s (%s)", name, server))
		return nil
	}

	query := u.Query()
	security := withDefault(query.Get("security"), "none")
	sni := withDefault(query.Get("sni"), server)
	flow := query.Get("flow")
	transportType := withDefault(query.Get("type"), "")
	if transportType == "xhttp" {
		logger.Warn("跳过不支持的 Vless xhttp 传输类型: " + uri)
		return nil
	}
	path := withDefault(query.Get("path"), "/")
	host := query.Get("host")

	outbound := map[string]any{
		"type":        "vless",
		"tag":         name,
		"server":      server,
		"server_port": port,
		"uuid":        uuid,
		"flow":        flow,
	}

	if security == "tls" || security == "reality" {
		tls := map[string]any{
			"enabled":     true,
			"server_name": sni,
		}
		if security == "reality" {
			outbound["tag"] = asString(outbound["tag"]) + "（不安全）"
			tls["utls"] = map[string]any{
				"enabled":     true,
				"fingerprint": "chrome",
			}
			tls["reality"] = map[string]any{
				"enabled":    true,
				"public_key": query.Get("pbk"),
				"short_id":   query.Get("sid"),
			}
			logger.Warn("检测到 Reality 配置，已为节点启用 uTLS: " + asString(outbound["tag"]))
		}
		outbound["tls"] = tls
	}

	if transport := buildTransport(transportType, host, path); transport != nil {
		outbound["transport"] = transport
	}

	return outbound
}

// parseURI 按协议分发 URI 到对应解析函数。
func parseURI(uri string) map[string]any {
	uri = strings.TrimSpace(uri)
	if uri == "" {
		return nil
	}
	switch {
	case strings.HasPrefix(uri, "ss://"):
		return parseSS(uri)
	case strings.HasPrefix(uri, "vmess://"):
		return parseVMess(uri)
	case strings.HasPrefix(uri, "trojan://"):
		return parseTrojan(uri)
	case strings.HasPrefix(uri, "vless://"):
		return parseVLess(uri)
	}

	proto := uri
	if i := strings.Index(uri, "://"); i > 0 {
		proto = strings.ToUpper(uri[:i])
	}
	logger.Warn("跳过未实现的转换协议: " + proto)
	return nil
}

// buildSingboxConfig 将解析后的 outbounds 组装成完整 sing-box 配置。
func buildSingboxConfig(outbounds []map[string]any) (map[string]any, error) {
	filtered := make([]map[string]any, 0, len(outbounds))
	for _, ob := range outbounds {
		if ob != nil {
			filtered = append(filtered, ob)
		}
	}
	if len(filtered) == 0 {
		return nil, errors.New("没有成功解析出任何节点")
	}

	config := map[string]any{
		"log": map[string]any{
			"disabled":  true,
			"level":     "error",
			"output":    "logs/singbox-bin.log",
			"timestamp": true,
		},
		"dns": map[string]any{
			"servers": []any{
				map[string]any{
					"type":       "hosts",
					"tag":        "hosts-dns",
					"predefined": map[string]any{},
				},
			},
		},
		"inbounds": []any{
			map[string]any{
				"type":        "socks",
				"tag":         "socks-in",
				"listen":      "::",
				"listen_port": 65001,
			},
			map[string]any{
				"type":        "tproxy",
				"tag":         "tproxy-in",
				"listen":      "::",
				"listen_port": 65002,
			},
			map[string]any{
				"type":        "redirect",
				"tag":         "redirect-in",
				"listen":      "::",
				"listen_port": 65003,
			},
		},
		"outbounds": filtered,
		"route": map[string]any{
			"rules": []any{},
			"final": filtered[0]["tag"],
		},
	}
	return config, nil
}

// convert 执行完整转换流程：拉取订阅、识别格式、解析节点并生成配置。
func convert(subscriptionURL string) (map[string]any, error) {
	content, err := fetchSubscription(subscriptionURL, 15*time.Second)
	if err != nil {
		return nil, err
	}
	outbounds := make([]map[string]any, 0)

	normalized := strings.ReplaceAll(content, "\n", "")
	base64Like, _ := regexp.MatchString(`^[A-Za-z0-9+/=]+$`, normalized)
	if isBase64(content) || base64Like {
		logger.Success("检测到 Base64 格式")
		uris, err := decodeBase64Sub(content)
		if err != nil {
			return nil, err
		}
		logger.Success(fmt.Sprintf("共解析到 %d 条 URI", len(uris)))
		for _, uri := range uris {
			if ob := parseURI(uri); ob != nil {
				outbounds = append(outbounds, ob)
			}
		}
	} else {
		logger.Success("尝试按行解析 URI")
		for _, line := range strings.Split(content, "\n") {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			if ob := parseURI(line); ob != nil {
				outbounds = append(outbounds, ob)
			}
		}
	}

	logger.Success(fmt.Sprintf("成功转换 %d 个节点", len(outbounds)))
	return buildSingboxConfig(outbounds)
}

// Sub2box 处理命令行参数并输出转换后的 sing-box JSON。
func Sub2box(rawURL string, outputFile string) {

	config, err := convert(rawURL)

	if err != nil {
		logger.Error("转换失败: " + err.Error())
		os.Exit(1)
	}

	result, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		logger.Error("转换失败: " + err.Error())
		os.Exit(1)
	}

	if outputFile != "" {
		if err := os.WriteFile(outputFile, result, 0o644); err != nil {
			logger.Error("转换失败: " + err.Error())
			os.Exit(1)
		}
		logger.Success("已保存到 " + outputFile)
		return
	}

	fmt.Println(string(result))
	logger.Success("已完成转换，复制上面的 JSON 配置到 sing-box 即可使用")
}
