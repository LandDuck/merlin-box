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
	"encoding/json"
	"os"

	dbHelper "github.com/LandDuck/merlin-box/helper/db"
	logger "github.com/LandDuck/merlin-box/helper/log"
	"github.com/LandDuck/merlin-box/model/db"
)

// saveShadowsocksNode 保存 shadowsocks 节点配置到数据库中
func saveShadowsocksNode(outbound map[string]any, category string) bool {

	//var debugInfo, _ = json.MarshalIndent(outbound, "", "  ")
	//logger.Debug("正在保存 shadowsocks 节点配置: ", string(debugInfo))

	var nodeType = "shadowsocks"
	method, _ := outbound["method"].(string)
	password, _ := outbound["password"].(string)
	network, _ := outbound["network"].(string)
	nodeBase := getNodeBase(nodeType, category, outbound)
	if nodeBase == nil {
		tag, _ := outbound["tag"].(string)
		logger.Error("保存“" + tag + "”节点失败: 无法解析服务器地址")
		return false
	}
	var dbModel = db.ShadowsocksNode{
		NodeBase: *nodeBase,
		Method:   method,
		Password: password,
		Network:  network,
	}
	return persistNode(dbModel.NodeBase, dbModel)
}

// saveTrojanNode 保存 trojan 节点配置到数据库中
func saveTrojanNode(outbound map[string]any, category string) bool {

	//var debugInfo, _ = json.MarshalIndent(outbound, "", "  ")
	//logger.Debug("正在保存 trojan 节点配置: ", string(debugInfo))

	var nodeType = "trojan"
	password, _ := outbound["password"].(string)
	network, _ := outbound["network"].(string)
	tls := getOutboundField[db.TLSConfig](outbound, "tls")
	transport := getOutboundField[db.TransportConfig](outbound, "transport")
	nodeBase := getNodeBase(nodeType, category, outbound)
	if nodeBase == nil {
		tag, _ := outbound["tag"].(string)
		logger.Error("保存“" + tag + "”节点失败: 无法解析服务器地址")
		return false
	}
	var dbModel = db.TrojanNode{
		NodeBase: *nodeBase,
		Password: password,
		Network:  network,
		NodeTransport: db.NodeTransport{
			Transport: transport,
		},
		NodeTls: db.NodeTls{
			Tls: tls,
		},
	}
	return persistNode(dbModel.NodeBase, dbModel)
}

// persistNode 验重并将节点写入数据库，node 为任意以 NodeBase 为基础的节点结构体
func persistNode(base db.NodeBase, node any) bool {
	exists, err := dbHelper.NodeTagExists(base.Tag)
	if err != nil {
		logger.Error("验重读取失败: " + err.Error())
		return false
	}
	if exists {
		logger.Error("节点 " + base.Name + " 已存在")
		return false
	}
	toDbJson, _ := json.MarshalIndent(node, "", "  ")
	if err = dbHelper.AppendNode(toDbJson); err != nil {
		logger.Error("保存节点失败: " + err.Error())
		return false
	}
	return true
}

// saveVlessNode 保存 vless 节点配置到数据库中
func saveVlessNode(outbound map[string]any, category string) bool {

	//var debugInfo, _ = json.MarshalIndent(outbound, "", "  ")
	//logger.Debug("正在保存 vless 节点配置: ", string(debugInfo))

	var nodeType = "vless"
	uuid, _ := outbound["uuid"].(string)
	flow, _ := outbound["flow"].(string)
	network, _ := outbound["network"].(string)
	tls := getOutboundField[db.TLSConfigWithReality](outbound, "tls")
	transport := getOutboundField[db.TransportConfig](outbound, "transport")
	nodeBase := getNodeBase(nodeType, category, outbound)
	if nodeBase == nil {
		logger.Error("保存“" + outbound["tag"].(string) + "”节点失败: 无法解析服务器地址")
		return false
	}
	var dbModel = db.VlessNode{
		NodeBase: *nodeBase,
		UUID:     uuid,
		Flow:     flow,
		Tls:      tls,
		Network:  network,
		NodeTransport: db.NodeTransport{
			Transport: transport,
		},
	}
	return persistNode(dbModel.NodeBase, dbModel)
}

// getOutboundField 从 outbound 中按 key 取出子配置并转换为指定类型，缺失或解析失败时返回零值
func getOutboundField[T any](outbound map[string]any, key string) T {
	var result T
	if raw, ok := outbound[key]; ok {
		if data, err := json.Marshal(raw); err == nil {
			_ = json.Unmarshal(data, &result)
		}
	}
	return result
}

// getNodeBase 从 outbound 中提取公共节点信息，返回 NodeBase 对象
func getNodeBase(nodeType string, category string, outbound map[string]any) *db.NodeBase {

	server, _ := outbound["server"].(string)
	serverPort, _ := outbound["server_port"].(int)
	tag, _ := outbound["tag"].(string)

	if isDomain(server) {
		server = domainToIp(server)
		if server == "" {
			return nil
		}
	}

	return &db.NodeBase{
		Type:       nodeType,
		Server:     server,
		ServerPort: serverPort,
		Category:   category,
		IsDefault:  false,
		Tag:        getMD5(category + nodeType + tag + server),
		Name:       tag,
	}
}

// Sub2nodes 将订阅链接转换为节点配置
func Sub2nodes(url string, category string) {
	//调用原来的转换逻辑
	config, err := convert(url)
	if err != nil {
		logger.Error("转换失败: " + err.Error())
		os.Exit(1)
	}
	logger.Debug("==================================================")
	var totalNodes = 0
	var writeNodes = 0
	//从里面找到 outbounds 节点配置遍历写入UI列表
	if outbounds, ok := config["outbounds"].([]map[string]any); ok {
		totalNodes = len(outbounds)
		if totalNodes == 0 {
			logger.Warn("订阅链接中没有找到任何节点配置，请检查订阅链接是否有效")
			return
		}
		//先清空数据库中该分类下的节点配置
		dbHelper.DeleteNodesByCategory(category)
		//开始执行
		logger.Debug("开始转换 ", totalNodes, " 个节点配置并写入 UI 列表，请耐心等待...")
		for _, outbound := range outbounds {
			var nodeType = outbound["type"].(string)
			switch nodeType {
			case "vless":
				if saveVlessNode(outbound, category) {
					writeNodes++
				}
			case "trojan":
				if saveTrojanNode(outbound, category) {
					writeNodes++
				}
			case "shadowsocks":
				if saveShadowsocksNode(outbound, category) {
					writeNodes++
				}
			default:
				logger.Warn("暂不支持的节点类型: ", nodeType, "，跳过该节点")
				continue
			}
		}
	}

	logger.Success("节点转换完成，共写入 ", writeNodes, " 个节点到 UI 列表")
}
