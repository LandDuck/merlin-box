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
	"encoding/json"
	"fmt"
	dbHelper "merlin-box-ui/helper/db"
	httpHelper "merlin-box-ui/helper/http"
	validateHelper "merlin-box-ui/helper/validate"
	dbModel "merlin-box-ui/model/db"
	reqModel "merlin-box-ui/model/req"
	"net/http"
	"strings"
)

// AddNode 添加节点
func AddNode(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[reqModel.AddNode](w, r)
	if !ok {
		return
	}
	switch requestData.Type {
	case "naive":
		addNaiveNode(w, requestData.Data)
	case "shadowsocks":
		addShadowsocksNode(w, requestData.Data)
	default:
		httpHelper.ResponseFailure(w, "不支持的节点类型: "+requestData.Type)
	}
}

// saveNode 通用节点保存逻辑：检查 tag 唯一性 → 序列化 → 持久化
func saveNode(w http.ResponseWriter, tag string, node any) {
	exists, err := dbHelper.NodeTagExists(tag)
	if err != nil {
		httpHelper.ResponseFailure(w, "读取节点数据失败")
		return
	}
	if exists {
		httpHelper.ResponseFailure(w, "节点 tag 已存在，请勿重复添加")
		return
	}
	raw, err := json.Marshal(node)
	if err != nil {
		httpHelper.ResponseFailure(w, "节点数据序列化失败")
		return
	}
	if err := dbHelper.AppendNode(raw); err != nil {
		httpHelper.ResponseFailure(w, "添加节点失败")
		return
	}
	httpHelper.ResponseSuccess(w, "添加成功")
}

// addNaiveNode 处理 Naive 节点添加逻辑
func addNaiveNode(w http.ResponseWriter, data string) {
	var node dbModel.NaiveNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateNaiveNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node)
}

// validateNaiveNode 校验 Naive 节点各必填字段
func validateNaiveNode(node dbModel.NaiveNode) error {
	if strings.TrimSpace(node.Tag) == "" {
		return fmt.Errorf("节点 tag 不能为空")
	}
	if strings.TrimSpace(node.Name) == "" {
		return fmt.Errorf("节点名称不能为空")
	}
	if strings.TrimSpace(node.Server) == "" {
		return fmt.Errorf("服务器地址不能为空")
	}
	if node.ServerPort < 1 || node.ServerPort > 65535 {
		return fmt.Errorf("服务器端口不合法，有效范围 1-65535")
	}
	if strings.TrimSpace(node.Username) == "" {
		return fmt.Errorf("用户名不能为空")
	}
	if strings.TrimSpace(node.Password) == "" {
		return fmt.Errorf("密码不能为空")
	}
	if strings.TrimSpace(node.Tls.ServerName) == "" {
		return fmt.Errorf("TLS Server Name 不能为空")
	}
	return nil
}

// validShadowsocksMethods 合法的 Shadowsocks 加密方式集合
var validShadowsocksMethods = map[string]struct{}{
	"none": {}, "2022-blake3-aes-128-gcm": {}, "2022-blake3-aes-256-gcm": {},
	"2022-blake3-chacha20-poly1305": {}, "aes-128-gcm": {}, "aes-192-gcm": {},
	"aes-256-gcm": {}, "chacha20-ietf-poly1305": {}, "xchacha20-ietf-poly1305": {},
	"aes-128-ctr": {}, "aes-192-ctr": {}, "aes-256-ctr": {},
	"aes-128-cfb": {}, "aes-192-cfb": {}, "aes-256-cfb": {},
	"rc4-md5": {}, "chacha20-ietf": {}, "xchacha20": {},
}

// addShadowsocksNode 处理 Shadowsocks 节点添加逻辑
func addShadowsocksNode(w http.ResponseWriter, data string) {
	var node dbModel.ShadowsocksNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateShadowsocksNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node)
}

// validateShadowsocksNode 校验 Shadowsocks 节点各必填字段
func validateShadowsocksNode(node dbModel.ShadowsocksNode) error {
	if strings.TrimSpace(node.Tag) == "" {
		return fmt.Errorf("节点 tag 不能为空")
	}
	if strings.TrimSpace(node.Name) == "" {
		return fmt.Errorf("节点名称不能为空")
	}
	if strings.TrimSpace(node.Server) == "" {
		return fmt.Errorf("服务器地址不能为空")
	}
	if node.ServerPort < 1 || node.ServerPort > 65535 {
		return fmt.Errorf("服务器端口不合法，有效范围 1-65535")
	}
	if strings.TrimSpace(node.Password) == "" {
		return fmt.Errorf("密码不能为空")
	}
	if _, ok := validShadowsocksMethods[node.Method]; !ok {
		return fmt.Errorf("不支持的加密方式: %s", node.Method)
	}
	if node.Network != "" && node.Network != "tcp" && node.Network != "udp" {
		return fmt.Errorf("网络协议不合法，可选值为空（ALL）、tcp、udp")
	}
	return nil
}
