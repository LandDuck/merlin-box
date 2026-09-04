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

// NodeBase 节点基础信息结构体
type NodeBase struct {
	// Name 节点名称
	Name string `json:"name"`
	// Tag 节点标签 唯一标识
	Tag string `json:"tag"`
	// Type 节点类型
	Type string `json:"type"`
	// IsDefault 是否为默认节点
	IsDefault bool `json:"is_default"`
	// Server 节点服务器地址
	Server string `json:"server"`
	// ServerPort 节点服务器端口
	ServerPort int `json:"server_port"`
}

// TLSConfig 节点 TLS 配置结构体
type TLSConfig struct {
	// Enabled 是否启用 TLS，true 启用，false 禁用
	Enabled bool `json:"enabled"`
	// ServerName TLS 服务器名称
	ServerName string `json:"server_name"`
}

// RealityConfig 节点 Reality 配置结构体
type RealityConfig struct {
	// Enabled 是否启用 Reality，true 启用，false 禁用
	Enabled bool `json:"enabled"`
	// PublicKey Reality 公钥
	PublicKey string `json:"public_key"`
	// ShortId Reality 短 ID
	ShortId string `json:"short_id"`
}

// TLSConfigWithReality 节点 TLS + Reality 配置结构体
type TLSConfigWithReality struct {
	TLSConfig
	Reality RealityConfig `json:"reality"`
}

// NodeTls 节点 TLS 配置结构体
type NodeTls struct {
	// Tls TLS 配置
	Tls TLSConfig `json:"tls"`
}

// TransportConfig 节点传输配置结构体
type TransportConfig struct {
	// Type 传输类型
	Type string `json:"type"`
	// Path 传输路径
	Path string `json:"path,omitempty"`
	// Host 传输主机
	Host string `json:"host,omitempty"`
	// Method 传输方法
	Method string `json:"method,omitempty"`
	// ServiceName 传输服务名称
	ServiceName string `json:"service_name,omitempty"`
}

// TransportConfig 节点传输配置结构体
type NodeTransport struct {
	Transport TransportConfig `json:"transport"`
}

// NaiveNode 节点基础信息结构体，继承 NodeBase
type NaiveNode struct {
	NodeBase
	// Username 节点用户名
	Username string `json:"username"`
	// Password 节点密码
	Password string `json:"password"`
	// UdpOverTCP 是否启用 UDP over TCP，true 启用，false 禁用
	UdpOverTCP bool `json:"udp_over_tcp"`
	// Quic 是否启用 QUIC，true 启用，false 禁用
	Quic bool `json:"quic"`
	// QuicCongestionControl QUIC 拥塞控制
	QuicCongestionControl string `json:"quic_congestion_control"`
	NodeTls
}

// ShadowsocksNode 节点基础信息结构体，继承 NodeBase
type ShadowsocksNode struct {
	NodeBase
	// Method 节点加密方法
	Method string `json:"method"`
	// Password 节点密码
	Password string `json:"password"`
	// Network 节点网络类型
	Network string `json:"network"`
	// UdpOverTCP 是否启用 UDP over TCP，true 启用，false 禁用
	UdpOverTCP bool `json:"udp_over_tcp"`
}

// AnytlsNode 节点基础信息结构体，继承 NodeBase
type AnytlsNode struct {
	NodeBase
	// Password 节点密码
	Password string `json:"password"`
	NodeTls
}

// Hysteria2Tls TLS 配置结构体
type Hysteria2Tls struct {
	TLSConfig
	// Alpn ALPN 配置，是一个数组 string
	Alpn []string `json:"alpn"`
}

// Hysteria2Obfs 混淆配置结构体
type Hysteria2Obfs struct {
	// Type 混淆类型
	Type string `json:"type"`
	// Password 混淆密码
	Password string `json:"password"`
}

// Hysteria2Node 节点基础信息结构体，继承 NodeBase
type Hysteria2Node struct {
	NodeBase
	// UpMbps 节点上行带宽限制，单位 Mbps
	UpMbps int `json:"up_mbps"`
	// DownMbps 节点下行带宽限制，单位 Mbps
	DownMbps int `json:"down_mbps"`
	// Password 节点密码
	Password string `json:"password"`
	// Network 节点网络类型
	Network string `json:"network"`
	// Obfs 混淆配置
	Obfs Hysteria2Obfs `json:"obfs"`
	// Tls TLS 配置
	Tls Hysteria2Tls `json:"tls"`
}

// TrojanNode 节点基础信息结构体，继承 NodeBase
type TrojanNode struct {
	NodeBase
	// Password 节点密码
	Password string `json:"password"`
	// Network 节点网络类型
	Network string `json:"network"`
	NodeTransport
	NodeTls
}

// VmessNode 节点基础信息结构体，继承 NodeBase
type VmessNode struct {
	NodeBase
	// UUID 节点 UUID
	UUID string `json:"uuid"`
	// AlterID 节点 AlterID
	AlterID int `json:"alter_id"`
	// Security 节点加密方式
	Security string `json:"security"`
	// Network 节点网络类型
	Network string `json:"network"`
	NodeTransport
	NodeTls
}

// VlessNode 节点基础信息结构体，继承 NodeBase
type VlessNode struct {
	NodeBase
	// UUID 节点 UUID
	UUID string `json:"uuid"`
	// Flow 节点流量控制
	Flow string `json:"flow"`
	// Network 节点网络类型
	Network string `json:"network"`
	NodeTransport
	// Tls TLS 配置
	Tls TLSConfigWithReality `json:"tls"`
}

// TuicNode 节点基础信息结构体，继承 NodeBase
type TuicNode struct {
	NodeBase
	// UUID 节点 UUID
	UUID string `json:"uuid"`
	// Password 节点密码
	Password string `json:"password"`
	// CongestionControl 节点拥塞控制
	CongestionControl string `json:"congestion_control"`
	// UdpRelayMode 节点 UDP 中继模式
	UdpRelayMode string `json:"udp_relay_mode"`
	// Network 节点网络类型
	Network string `json:"network"`
	NodeTls
}

// SnellNode 节点基础信息结构体，继承 NodeBase
type SnellNode struct {
	NodeBase
	// Version 协议版本 4 or 6
	Version int `json:"version"`
	// Psk 节点预共享密钥
	Psk string `json:"psk"`
	// UserKey 用户密钥，用于向多用户服务器进行认证。
	UserKey string `json:"userkey"`
	// Reuse 启用连接复用
	Reuse bool `json:"reuse"`
	// Network 启用的网络协议
	Network string `json:"network"`
	// Mode 流量整形模式，default unshaped unsafe-raw 之一。 仅版本 6
	Mode string `json:"mode"`
	// ObfsMode 混淆模式 仅版本 4 none http 之一。
	ObfsMode string `json:"obfs_mode"`
	// ObfsHost 仅版本 4  obfs_mode 为 http 时发送的 HTTP Host 头。
	ObfsHost string `json:"obfs_host"`
}
