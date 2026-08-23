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

package db

import "encoding/json"

// Database 数据库结构体，包含管理员列表
type Database struct {
	// Managers 管理员列表
	Managers []Manager `json:"managers"`
	// BaseConfig 基础选项配置
	BaseConfig BaseConfigInfo `json:"baseConfig"`
	// DNS DNS 配置
	DNS DNSInfo `json:"dns"`
	// Device 设备信息
	Device DeviceInfo `json:"device"`
	// IP4 IPv4 控制信息
	IP4 IPControlInfo `json:"ip4"`
	// IP6 IPv6 控制信息
	IP6 IPControlInfo `json:"ip6"`
	// Domain 域名控制信息
	Domain DomainControlInfo `json:"domain"`
	// Nodes 节点列表，每个元素为原始 JSON（支持多种节点类型）
	Nodes []json.RawMessage `json:"nodes"`
}

// Manager 管理员结构体，包含用户名和密码
type Manager struct {
	// Username 用户名 只能是字母和数字的组合，长度为5-16位
	Username string `json:"username"`
	// Password 密码 一个MD5加密后的字符串(小写) 32位
	Password string `json:"password"`
}

// DeviceInfo 设备信息结构体，包含设备名称和版本号
type DeviceInfo struct {
	// Blacklist 黑名单 MAC 地址, 一行一个
	Blacklist string `json:"blacklist"`
	// Whitelist 白名单 MAC 地址, 一行一个
	Whitelist string `json:"whitelist"`
}

// IPControlInfo IP 白名单/黑名单控制信息
type IPControlInfo struct {
	// Blacklist 黑名单 IP 地址, 一行一个
	Blacklist string `json:"blacklist"`
	// Whitelist 白名单 IP 地址, 一行一个
	Whitelist string `json:"whitelist"`
}

// DomainControlInfo 域名黑名单/屏蔽列表控制信息
type DomainControlInfo struct {
	// Blocklist 域名屏蔽列表, 一行一个
	Blocklist string `json:"blocklist"`
	// Blacklist 域名黑名单列表, 一行一个
	Blacklist string `json:"blacklist"`
}

// BaseConfigInfo 基础选项配置
type BaseConfigInfo struct {
	// EnableIPv6 是否启用 IPv6，1 启用，0 禁用
	EnableIPv6 int `json:"enableIPv6"`
	// EnableUDP 是否启用 UDP，1 启用，0 禁用
	EnableUDP int `json:"enableUDP"`
	// DisableQUIC 是否禁用 QUIC，1 禁用，0 不禁用
	DisableQUIC int `json:"disableQUIC"`
	// RouteSelfProxy 是否路由自身代理，1 启用，0 禁用
	RouteSelfProxy int `json:"routeSelfProxy"`
}

// DNSInfo DNS 配置
type DNSInfo struct {
	// China 大陆 DNS 列表
	China []string `json:"china"`
	// Foreign 国际 DNS 列表
	Foreign []string `json:"foreign"`
}

// BaseConfigFull 基础配置（含DNS）的 API 视图，用于接口请求和响应
type BaseConfigFull struct {
	// EnableIPv6 是否启用 IPv6，1 启用，0 禁用
	EnableIPv6 int `json:"enableIPv6"`
	// EnableUDP 是否启用 UDP，1 启用，0 禁用
	EnableUDP int `json:"enableUDP"`
	// DisableQUIC 是否禁用 QUIC，1 禁用，0 不禁用
	DisableQUIC int `json:"disableQUIC"`
	// RouteSelfProxy 是否路由自身代理，1 启用，0 禁用
	RouteSelfProxy int `json:"routeSelfProxy"`
	// DnsChina 大陆 DNS，固定两个
	DnsChina []string `json:"dnsChina"`
	// DnsForeign 国际 DNS，固定两个
	DnsForeign []string `json:"dnsForeign"`
}
