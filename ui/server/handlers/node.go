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
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/LandDuck/merlin-box/global"
	dbHelper "github.com/LandDuck/merlin-box/helper/db"
	httpHelper "github.com/LandDuck/merlin-box/helper/http"
	validateHelper "github.com/LandDuck/merlin-box/helper/validate"
	dbModel "github.com/LandDuck/merlin-box/model/db"
	reqModel "github.com/LandDuck/merlin-box/model/req"
	"github.com/LandDuck/merlin-box/model/singbox"
)

// SaveNode 添加节点
func SaveNode(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[reqModel.SaveNode](w, r)
	if !ok {
		return
	}
	switch requestData.Type {
	case "naive":
		saveNaiveNode(w, requestData.Data, requestData.Action)
	case "shadowsocks":
		saveShadowsocksNode(w, requestData.Data, requestData.Action)
	case "anytls":
		saveAnytlsNode(w, requestData.Data, requestData.Action)
	case "hysteria2":
		saveHysteria2Node(w, requestData.Data, requestData.Action)
	case "trojan":
		saveTrojanNode(w, requestData.Data, requestData.Action)
	case "vmess":
		saveVmessNode(w, requestData.Data, requestData.Action)
	case "vless":
		saveVlessNode(w, requestData.Data, requestData.Action)
	case "tuic":
		saveTuicNode(w, requestData.Data, requestData.Action)
	case "snell":
		saveSnellNode(w, requestData.Data, requestData.Action)
	default:
		httpHelper.ResponseFailure(w, "不支持的节点类型: "+requestData.Type)
	}
}

// saveNode 通用节点保存逻辑：根据 action 判断是新增还是更新，再执行对应持久化
func saveNode(w http.ResponseWriter, tag string, node any, action string) {
	raw, err := json.MarshalIndent(node, "", "  ")
	if err != nil {
		httpHelper.ResponseFailure(w, "节点数据序列化失败")
		return
	}

	if action == "add" {
		exists, err := dbHelper.NodeTagExists(tag)
		if err != nil {
			httpHelper.ResponseFailure(w, "读取节点数据失败")
			return
		}
		if exists {
			httpHelper.ResponseFailure(w, "节点 tag 已存在，请勿重复添加")
			return
		}
		if err := dbHelper.AppendNode(raw); err != nil {
			httpHelper.ResponseFailure(w, "添加节点失败")
			return
		}

		// 验证是否只有一个节点，若是则设置为默认节点
		nodes, err := dbHelper.GetNodeList()
		if err == nil && len(nodes) == 1 {
			if err := dbHelper.SetDefaultNode(tag); err != nil {
				httpHelper.ResponseFailure(w, "设置默认节点失败")
				return
			}
			configJson, err := parseNode(raw, tag)
			if err == nil {
				confPath := filepath.Join(global.ConfDir, "config.json")
				_ = os.WriteFile(confPath, []byte(configJson), 0644)
			}
		}
		httpHelper.ResponseSuccess(w, "添加成功")
		return
	}

	if action == "edit" {
		if err := dbHelper.UpdateNodeByTag(tag, raw); err != nil {
			if strings.Contains(err.Error(), "node not found") {
				httpHelper.ResponseFailure(w, "节点不存在，无法编辑")
			} else {
				httpHelper.ResponseFailure(w, "更新节点失败")
			}
			return
		}

		// 验证当前节点是否是default节点，如果是则更新配置文件
		var nodeData struct {
			IsDefault bool `json:"is_default"`
		}
		err := json.Unmarshal(raw, &nodeData)
		if err == nil {
			if nodeData.IsDefault {
				configJson, err := parseNode(raw, tag)
				if err == nil {
					confPath := filepath.Join(global.ConfDir, "config.json")
					_ = os.WriteFile(confPath, []byte(configJson), 0644)
				}
			}
		}

		httpHelper.ResponseSuccess(w, "更新成功")
		return
	}

	httpHelper.ResponseFailure(w, "不支持的操作类型: "+action)
}

// saveNaiveNode 处理 Naive 节点添加逻辑
func saveNaiveNode(w http.ResponseWriter, data string, action string) {
	var node dbModel.NaiveNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateNaiveNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node, action)
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

// saveShadowsocksNode 处理 Shadowsocks 节点添加逻辑
func saveShadowsocksNode(w http.ResponseWriter, data string, action string) {
	var node dbModel.ShadowsocksNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateShadowsocksNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node, action)
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

// saveAnytlsNode 处理 Anytls 节点添加逻辑
func saveAnytlsNode(w http.ResponseWriter, data string, action string) {
	var node dbModel.AnytlsNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateAnytlsNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node, action)
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

// saveHysteria2Node 处理 Hysteria2 节点添加逻辑
func saveHysteria2Node(w http.ResponseWriter, data string, action string) {
	var node dbModel.Hysteria2Node
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateHysteria2Node(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node, action)
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

// saveTrojanNode 处理 Trojan 节点添加逻辑
func saveTrojanNode(w http.ResponseWriter, data string, action string) {
	var node dbModel.TrojanNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateTrojanNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node, action)
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

// saveVmessNode 处理 Vmess 节点添加逻辑
func saveVmessNode(w http.ResponseWriter, data string, action string) {
	var node dbModel.VmessNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateVmessNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node, action)
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

// saveVlessNode 处理 Vless 节点添加逻辑
func saveVlessNode(w http.ResponseWriter, data string, action string) {
	var node dbModel.VlessNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateVlessNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node, action)
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

// saveTuicNode 处理 Tuic 节点添加逻辑
func saveTuicNode(w http.ResponseWriter, data string, action string) {
	var node dbModel.TuicNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateTuicNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node, action)
}

// validateTuicNode 校验 Tuic 节点各必填字段
func validateTuicNode(node dbModel.TuicNode) error {
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
	if strings.TrimSpace(node.Password) == "" {
		return fmt.Errorf("密码不能为空")
	}
	if strings.TrimSpace(node.Tls.ServerName) == "" {
		return fmt.Errorf("TLS Server Name 不能为空")
	}
	return nil
}

// saveSnellNode 处理 Snell 节点添加逻辑
func saveSnellNode(w http.ResponseWriter, data string, action string) {
	var node dbModel.SnellNode
	if err := json.Unmarshal([]byte(data), &node); err != nil {
		httpHelper.ResponseFailure(w, "节点数据解析失败")
		return
	}
	if err := validateSnellNode(node); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	saveNode(w, node.Tag, node, action)
}

// validateSnellNode 校验 Snell 节点各必填字段
func validateSnellNode(node dbModel.SnellNode) error {
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
	if node.Version != 4 && node.Version != 6 {
		return fmt.Errorf("版本不合法，仅支持 4 或 6")
	}
	if strings.TrimSpace(node.Psk) == "" {
		return fmt.Errorf("预共享密钥不能为空")
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

// LoadNode 加载节点（按 tag）
func LoadNode(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[reqModel.NodeTagRequest](w, r)
	if !ok {
		return
	}
	node, err := dbHelper.GetNodeByTag(requestData.Tag)
	if err != nil {
		httpHelper.ResponseFailure(w, "获取节点失败")
		return
	}
	httpHelper.ResponseSuccess(w, node)
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

	//读取基础配置
	baseConfig, baseConfigErr := dbHelper.GetBaseConfig()
	if baseConfigErr != nil {
		return "{}", baseConfigErr
	}

	inbounds := []singbox.Inbound{
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
	}

	if baseConfig.RouteSelfProxy == 1 {
		inbounds = append(inbounds, singbox.Inbound{
			Type:       "redirect",
			Tag:        "redirect-in",
			Listen:     "::",
			ListenPort: 65003,
		})
	}

	//组织config
	config := singbox.Config{
		Log: singbox.LogConfig{
			Disabled:  true,
			Level:     "error",
			Output:    "logs/singbox-bin.log",
			Timestamp: true,
		},
		Inbounds:  inbounds,
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
		if baseConfig.TcpFastOpen > 0 {
			outbound.TcpFastOpen = true
		}
		config.Outbounds = append(config.Outbounds, outbound)
	case "hysteria2":
		node := &dbModel.Hysteria2Node{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := hysteria2NodeToOutbound(*node)
		if baseConfig.TcpFastOpen > 0 {
			outbound.TcpFastOpen = true
		}
		config.Outbounds = append(config.Outbounds, outbound)
	case "shadowsocks":
		node := &dbModel.ShadowsocksNode{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := shadowsocksNodeToOutbound(*node)
		if baseConfig.TcpFastOpen > 0 {
			outbound.TcpFastOpen = true
		}
		config.Outbounds = append(config.Outbounds, outbound)
	case "anytls":
		node := &dbModel.AnytlsNode{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := anytlsNodeToOutbound(*node)
		if baseConfig.TcpFastOpen > 0 {
			outbound.TcpFastOpen = true
		}
		config.Outbounds = append(config.Outbounds, outbound)
	case "trojan":
		node := &dbModel.TrojanNode{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := trojanNodeToOutbound(*node)
		if baseConfig.TcpFastOpen > 0 {
			outbound.TcpFastOpen = true
		}
		config.Outbounds = append(config.Outbounds, outbound)
	case "vmess":
		node := &dbModel.VmessNode{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := vmessNodeToOutbound(*node)
		if baseConfig.TcpFastOpen > 0 {
			outbound.TcpFastOpen = true
		}
		config.Outbounds = append(config.Outbounds, outbound)
	case "vless":
		node := &dbModel.VlessNode{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := vlessNodeToOutbound(*node)
		if baseConfig.TcpFastOpen > 0 {
			outbound.TcpFastOpen = true
		}
		config.Outbounds = append(config.Outbounds, outbound)
	case "tuic":
		node := &dbModel.TuicNode{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := tuicNodeToOutbound(*node)
		if baseConfig.TcpFastOpen > 0 {
			outbound.TcpFastOpen = true
		}
		config.Outbounds = append(config.Outbounds, outbound)
	case "snell":
		node := &dbModel.SnellNode{}
		if err := json.Unmarshal(data, node); err != nil {
			return "{}", err
		}
		outbound := snellNodeToOutbound(*node)
		if baseConfig.TcpFastOpen > 0 {
			outbound.TcpFastOpen = true
		}
		config.Outbounds = append(config.Outbounds, outbound)
	default:
		return "{}", fmt.Errorf("unsupported node type: %s", nodeType.Type)
	}

	//转换为 JSON 字符串
	data, err := json.MarshalIndent(config, "", "  ")
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

	var transport *dbModel.TransportConfig = nil
	if n.Transport.Type != "" {
		transport = &n.Transport
	}

	return singbox.TrojanOutbound{
		Type:        n.Type,
		Server:      n.Server,
		ServerPort:  n.ServerPort,
		Password:    n.Password,
		Network:     n.Network,
		Tls:         n.Tls,
		Transport:   transport,
		Tag:         n.Tag,
		RoutingMark: 169,
	}
}

// vmessNodeToOutbound 将 Vmess 节点转换为 Singbox 出站配置
func vmessNodeToOutbound(n dbModel.VmessNode) singbox.VmessOutbound {

	var tls *dbModel.TLSConfig = nil
	if n.Tls.Enabled {
		tls = &n.Tls
	}

	var transport *dbModel.TransportConfig = nil
	if n.Transport.Type != "" {
		transport = &n.Transport
	}

	return singbox.VmessOutbound{
		Type:        n.Type,
		Server:      n.Server,
		ServerPort:  n.ServerPort,
		UUID:        n.UUID,
		AlterID:     n.AlterID,
		Security:    n.Security,
		Network:     n.Network,
		Tls:         tls,
		Transport:   transport,
		Tag:         n.Tag,
		RoutingMark: 169,
	}
}

// vlessNodeToOutbound 将 Vless 节点转换为 Singbox 出站配置
func vlessNodeToOutbound(n dbModel.VlessNode) singbox.VlessOutbound {

	var tls *singbox.TLSConfigWithReality

	if n.Tls.Enabled {
		var reality *dbModel.RealityConfig = nil
		var utls *singbox.UTLSConfig = nil
		if n.Tls.Reality.Enabled {
			reality = &n.Tls.Reality
			utls = &singbox.UTLSConfig{
				Enabled:     true,
				Fingerprint: "chrome",
			}
		}
		tls = &singbox.TLSConfigWithReality{
			TLSConfig: n.Tls.TLSConfig,
			Reality:   reality,
			Utls:      utls,
		}
	}

	var transport *dbModel.TransportConfig = nil
	if n.Transport.Type != "" {
		transport = &n.Transport
	}

	return singbox.VlessOutbound{
		Type:        n.Type,
		Server:      n.Server,
		ServerPort:  n.ServerPort,
		UUID:        n.UUID,
		Flow:        n.Flow,
		Network:     n.Network,
		Tls:         tls,
		Transport:   transport,
		Tag:         n.Tag,
		RoutingMark: 169,
	}
}

// tuicNodeToOutbound 将 Tuic 节点转换为 Singbox 出站配置
func tuicNodeToOutbound(n dbModel.TuicNode) singbox.TuicOutbound {
	return singbox.TuicOutbound{
		Type:        n.Type,
		Server:      n.Server,
		ServerPort:  n.ServerPort,
		UUID:        n.UUID,
		Password:    n.Password,
		Network:     n.Network,
		Tls:         n.Tls,
		Tag:         n.Tag,
		RoutingMark: 169,
	}
}

// snellNodeToOutbound 将 Snell 节点转换为 Singbox 出站配置
func snellNodeToOutbound(n dbModel.SnellNode) singbox.SnellOutbound {
	return singbox.SnellOutbound{
		Type:        n.Type,
		Server:      n.Server,
		ServerPort:  n.ServerPort,
		Psk:         n.Psk,
		Version:     n.Version,
		UserKey:     n.UserKey,
		Reuse:       n.Reuse,
		Network:     n.Network,
		Mode:        n.Mode,
		ObfsMode:    n.ObfsMode,
		ObfsHost:    n.ObfsHost,
		Tag:         n.Tag,
		RoutingMark: 169,
	}
}
