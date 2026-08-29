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
	"merlin-box-ui/global"
	dbHelper "merlin-box-ui/helper/db"
	httpHelper "merlin-box-ui/helper/http"
	validateHelper "merlin-box-ui/helper/validate"
	dbModel "merlin-box-ui/model/db"
	reqModel "merlin-box-ui/model/req"
	"merlin-box-ui/model/singbox"
	"net/http"
	"os"
	"path/filepath"
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
	case "anytls":
		addAnytlsNode(w, requestData.Data)
	case "hysteria2":
		addHysteria2Node(w, requestData.Data)
	case "trojan":
		addTrojanNode(w, requestData.Data)
	case "vmess":
		addVmessNode(w, requestData.Data)
	case "vless":
		addVlessNode(w, requestData.Data)
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

	//验证是否只有一个 节点
	nodes, err := dbHelper.GetNodeList()
	if err == nil {
		// 如果只有一个节点，设置为默认节点
		if len(nodes) == 1 {
			if err := dbHelper.SetDefaultNode(tag); err != nil {
			}
		}
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

// addAnytlsNode 处理 Anytls 节点添加逻辑
func addAnytlsNode(w http.ResponseWriter, data string) {
	var node dbModel.AnytlsNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateAnytlsNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node)
}

// validateAnytlsNode 校验 Anytls 节点各必填字段
func validateAnytlsNode(node dbModel.AnytlsNode) error {
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
	if strings.TrimSpace(node.Tls.ServerName) == "" {
		return fmt.Errorf("TLS Server Name 不能为空")
	}
	return nil
}

// addHysteria2Node 处理 Hysteria2 节点添加逻辑
func addHysteria2Node(w http.ResponseWriter, data string) {
	var node dbModel.Hysteria2Node
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateHysteria2Node(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node)
}

// validateHysteria2Node 校验 Hysteria2 节点各必填字段
func validateHysteria2Node(node dbModel.Hysteria2Node) error {
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
	if strings.TrimSpace(node.Obfs.Password) == "" {
		return fmt.Errorf("混淆密码不能为空")
	}
	if strings.TrimSpace(node.Password) == "" {
		return fmt.Errorf("密码不能为空")
	}
	if strings.TrimSpace(node.Tls.ServerName) == "" {
		return fmt.Errorf("TLS Server Name 不能为空")
	}
	return nil
}

// addTrojanNode 处理 Trojan 节点添加逻辑
func addTrojanNode(w http.ResponseWriter, data string) {
	var node dbModel.TrojanNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateTrojanNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node)
}

// validateTrojanNode 校验 Trojan 节点各必填字段
func validateTrojanNode(node dbModel.TrojanNode) error {
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
	if strings.TrimSpace(node.Tls.ServerName) == "" {
		return fmt.Errorf("TLS Server Name 不能为空")
	}
	return nil
}

// addVmessNode 处理 Vmess 节点添加逻辑
func addVmessNode(w http.ResponseWriter, data string) {
	var node dbModel.VmessNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateVmessNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node)
}

// validateVmessNode 校验 Vmess 节点各必填字段
func validateVmessNode(node dbModel.VmessNode) error {
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
	if strings.TrimSpace(node.UUID) == "" {
		return fmt.Errorf("UUID 不能为空")
	}
	return nil
}

// addVlessNode 处理 Vless 节点添加逻辑
func addVlessNode(w http.ResponseWriter, data string) {
	var node dbModel.VlessNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateVlessNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node)
}

// validateVlessNode 校验 Vless 节点各必填字段
func validateVlessNode(node dbModel.VlessNode) error {
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
	if strings.TrimSpace(node.UUID) == "" {
		return fmt.Errorf("UUID 不能为空")
	}
	return nil
}

// GetNodeList 获取节点列表（默认节点排第一）
func GetNodeList(w http.ResponseWriter, r *http.Request) {
	nodes, err := dbHelper.GetNodeList()
	if err != nil {
		httpHelper.ResponseFailure(w, "读取节点列表失败")
		return
	}
	if nodes == nil {
		nodes = []json.RawMessage{}
	}
	httpHelper.ResponseSuccess(w, nodes)
}

// DeleteNode 删除节点（按 tag）
func DeleteNode(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[reqModel.NodeTagRequest](w, r)
	if !ok {
		return
	}
	if err := dbHelper.DeleteNode(requestData.Tag); err != nil {
		httpHelper.ResponseFailure(w, "删除节点失败")
		return
	}
	httpHelper.ResponseSuccess(w, "删除成功")
}

// SetDefaultNode 设置默认节点（按 tag）
func SetDefaultNode(w http.ResponseWriter, r *http.Request) {

	requestData, ok := validateHelper.BindAndValidate[reqModel.NodeTagRequest](w, r)
	if !ok {
		return
	}
	if err := dbHelper.SetDefaultNode(requestData.Tag); err != nil {
		httpHelper.ResponseFailure(w, "设置默认节点失败")
		return
	}

	//读取
	nodeRaw, err := dbHelper.GetNodeByTag(requestData.Tag) //
	if err != nil {
		httpHelper.ResponseFailure(w, "获取节点失败")
		return
	}

	//解析并转换为 singbox 配置
	configJson, err := parseNode(nodeRaw, requestData.Tag)
	if err != nil {
		httpHelper.ResponseFailure(w, "解析节点失败")
		return
	}

	//写入 singbox 配置文件
	confPath := filepath.Join(global.ConfDir, "config.json")
	if err := os.WriteFile(confPath, []byte(configJson), 0644); err != nil {
		httpHelper.ResponseFailure(w, "写入配置文件失败")
		return
	}

	httpHelper.ResponseSuccess(w, "设置成功")
}

// parseNode 根据节点配置信息解析并生成 singbox 配置 JSON 字符串
func parseNode(data json.RawMessage, tag string) (string, error) {

	//解析类型
	var nodeType struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &nodeType); err != nil {
		return "{}", err
	}

	//组织config
	config := singbox.Config{
		Log: singbox.LogConfig{
			Disabled:  true,
			Level:     "error",
			Output:    "logs/singbox-bin.log",
			Timestamp: true,
		},
		Inbounds: []singbox.Inbound{
			{
				Type:       "socks",
				Tag:        "socks-in",
				Listen:     "::",
				ListenPort: 65001,
			},
			{
				Type:       "tproxy",
				Tag:        "tproxy-in",
				Listen:     "::",
				ListenPort: 65002,
			},
			{
				Type:       "redirect",
				Tag:        "redirect-in",
				Listen:     "::",
				ListenPort: 65003,
			},
		},
		Outbounds: []any{},
		Route: singbox.RouteConfig{
			Rules: []any{},
			Final: tag,
		},
	}

	//按不同类型处理
	switch nodeType.Type {
	case "naive":
		node := &dbModel.NaiveNode{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := naiveNodeToOutbound(*node)
		config.Outbounds = append(config.Outbounds, outbound)

	case "hysteria2":
		node := &dbModel.Hysteria2Node{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := hysteria2NodeToOutbound(*node)
		config.Outbounds = append(config.Outbounds, outbound)
	case "shadowsocks":
		node := &dbModel.ShadowsocksNode{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := shadowsocksNodeToOutbound(*node)
		config.Outbounds = append(config.Outbounds, outbound)
	case "anytls":
		node := &dbModel.AnytlsNode{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := anytlsNodeToOutbound(*node)
		config.Outbounds = append(config.Outbounds, outbound)
	case "trojan":
		node := &dbModel.TrojanNode{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := trojanNodeToOutbound(*node)
		config.Outbounds = append(config.Outbounds, outbound)

	default:
		return "{}", fmt.Errorf("unsupported node type: %s", nodeType.Type)
	}

	//转换为 JSON 字符串
	data, err := json.Marshal(config)
	if err != nil {
		return "{}", err
	}

	return string(data), nil
}

// naiveNodeToOutbound 将 Naive 节点转换为 Singbox 出站配置
func naiveNodeToOutbound(n dbModel.NaiveNode) singbox.NaiveOutbound {
	return singbox.NaiveOutbound{
		Type:        n.Type,
		Server:      n.Server,
		ServerPort:  n.ServerPort,
		Username:    n.Username,
		Password:    n.Password,
		Quic:        n.Quic,
		UdpOverTCP:  n.UdpOverTCP,
		TLS:         n.Tls,
		Tag:         n.Tag,
		RoutingMark: 169,
	}
}

// shadowsocksNodeToOutbound 将 Shadowsocks 节点转换为 Singbox 出站配置
func shadowsocksNodeToOutbound(n dbModel.ShadowsocksNode) singbox.ShadowsocksOutbound {
	return singbox.ShadowsocksOutbound{
		Type:        n.Type,
		Server:      n.Server,
		ServerPort:  n.ServerPort,
		Method:      n.Method,
		Password:    n.Password,
		Network:     n.Network,
		UdpOverTCP:  n.UdpOverTCP,
		Tag:         n.Tag,
		RoutingMark: 169,
	}
}

// hysteria2NodeToOutbound 将 Hysteria2 节点转换为 Singbox 出站配置
func hysteria2NodeToOutbound(n dbModel.Hysteria2Node) singbox.Hysteria2Outbound {
	return singbox.Hysteria2Outbound{
		Type:        n.Type,
		Server:      n.Server,
		ServerPort:  n.ServerPort,
		Password:    n.Password,
		UpMbps:      n.UpMbps,
		DownMbps:    n.DownMbps,
		Network:     n.Network,
		Obfs:        n.Obfs,
		Tls:         n.Tls,
		Tag:         n.Tag,
		RoutingMark: 169,
	}
}

// anytlsNodeToOutbound 将 Anytls 节点转换为 Singbox 出站配置
func anytlsNodeToOutbound(n dbModel.AnytlsNode) singbox.AnytlsOutbound {
	return singbox.AnytlsOutbound{
		Type:        n.Type,
		Server:      n.Server,
		ServerPort:  n.ServerPort,
		Password:    n.Password,
		Tls:         n.Tls,
		Tag:         n.Tag,
		RoutingMark: 169,
	}
}

// trojanNodeToOutbound 将 Trojan 节点转换为 Singbox 出站配置
func trojanNodeToOutbound(n dbModel.TrojanNode) singbox.TrojanOutbound {
	return singbox.TrojanOutbound{
		Type:        n.Type,
		Server:      n.Server,
		ServerPort:  n.ServerPort,
		Password:    n.Password,
		Network:     n.Network,
		Tls:         n.Tls,
		Tag:         n.Tag,
		RoutingMark: 169,
	}
}
