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

package singbox

import "merlin-box-ui/model/db"

// NaiveOutbound 出站配置结构体
type NaiveOutbound struct {
	Type        string       `json:"type"`
	Server      string       `json:"server"`
	ServerPort  int          `json:"server_port"`
	Username    string       `json:"username"`
	Password    string       `json:"password"`
	Quic        bool         `json:"quic"`
	UdpOverTCP  bool         `json:"udp_over_tcp"`
	TLS         db.TLSConfig `json:"tls"`
	Tag         string       `json:"tag"`
	RoutingMark int          `json:"routing_mark"`
}

// ShadowsocksOutbound 出站配置结构体
type ShadowsocksOutbound struct {
	Type        string `json:"type"`
	Server      string `json:"server"`
	ServerPort  int    `json:"server_port"`
	Method      string `json:"method"`
	Password    string `json:"password"`
	Network     string `json:"network,omitempty"`
	UdpOverTCP  bool   `json:"udp_over_tcp"`
	Tag         string `json:"tag"`
	RoutingMark int    `json:"routing_mark"`
}

// Hysteria2Outbound 出站配置结构体
type Hysteria2Outbound struct {
	Type        string           `json:"type"`
	Server      string           `json:"server"`
	ServerPort  int              `json:"server_port"`
	Password    string           `json:"password"`
	UpMbps      int              `json:"up_mbps"`
	DownMbps    int              `json:"down_mbps"`
	Network     string           `json:"network,omitempty"`
	Obfs        db.Hysteria2Obfs `json:"obfs"`
	Tls         db.Hysteria2Tls  `json:"tls"`
	Tag         string           `json:"tag"`
	RoutingMark int              `json:"routing_mark"`
}

// AnytlsOutbound 出站配置结构体
type AnytlsOutbound struct {
	Type        string       `json:"type"`
	Server      string       `json:"server"`
	ServerPort  int          `json:"server_port"`
	Password    string       `json:"password"`
	Tls         db.TLSConfig `json:"tls"`
	Tag         string       `json:"tag"`
	RoutingMark int          `json:"routing_mark"`
}

// TrojanOutbound 出站配置结构体
type TrojanOutbound struct {
	Type        string              `json:"type"`
	Server      string              `json:"server"`
	ServerPort  int                 `json:"server_port"`
	Password    string              `json:"password"`
	Tls         db.TLSConfig        `json:"tls"`
	Network     string              `json:"network,omitempty"`
	Tag         string              `json:"tag"`
	RoutingMark int                 `json:"routing_mark"`
	Transport   *db.TransportConfig `json:"transport,omitempty"`
}

// VmessOutbound 出站配置结构体
type VmessOutbound struct {
	Type        string              `json:"type"`
	Server      string              `json:"server"`
	ServerPort  int                 `json:"server_port"`
	UUID        string              `json:"uuid"`
	AlterID     int                 `json:"alter_id,omitempty"`
	Security    string              `json:"security,omitempty"`
	Network     string              `json:"network,omitempty"`
	Tls         *db.TLSConfig       `json:"tls,omitempty"`
	Tag         string              `json:"tag"`
	RoutingMark int                 `json:"routing_mark"`
	Transport   *db.TransportConfig `json:"transport,omitempty"`
}

// TLSConfigWithReality 节点 TLS + Reality 配置结构体，Reality 可选
type TLSConfigWithReality struct {
	db.TLSConfig
	Utls    *UTLSConfig       `json:"utls,omitempty"`
	Reality *db.RealityConfig `json:"reality,omitempty"`
}

// UTLSConfig UTLS 配置结构体
type UTLSConfig struct {
	Enabled     bool   `json:"enabled"`
	Fingerprint string `json:"fingerprint"`
}

// VlessOutbound 出站配置结构体
type VlessOutbound struct {
	Type        string                `json:"type"`
	Server      string                `json:"server"`
	ServerPort  int                   `json:"server_port"`
	UUID        string                `json:"uuid"`
	Flow        string                `json:"flow,omitempty"`
	Network     string                `json:"network,omitempty"`
	Tls         *TLSConfigWithReality `json:"tls,omitempty"`
	Tag         string                `json:"tag"`
	RoutingMark int                   `json:"routing_mark"`
	Transport   *db.TransportConfig   `json:"transport,omitempty"`
}

// TuicOutbound 出站配置结构体
type TuicOutbound struct {
	Type        string       `json:"type"`
	Server      string       `json:"server"`
	ServerPort  int          `json:"server_port"`
	UUID        string       `json:"uuid"`
	Password    string       `json:"password"`
	Network     string       `json:"network,omitempty"`
	Tls         db.TLSConfig `json:"tls"`
	Tag         string       `json:"tag"`
	RoutingMark int          `json:"routing_mark"`
}

// SnellOutbound 出站配置结构体
type SnellOutbound struct {
	Type        string `json:"type"`
	Server      string `json:"server"`
	ServerPort  int    `json:"server_port"`
	Version     int    `json:"version"`
	Psk         string `json:"psk,omitempty"`
	UserKey     string `json:"userkey,omitempty"`
	Reuse       bool   `json:"reuse"`
	Mode        string `json:"mode,omitempty"`
	ObfsMode    string `json:"obfs_mode,omitempty"`
	ObfsHost    string `json:"obfs_host,omitempty"`
	Network     string `json:"network,omitempty"`
	Tag         string `json:"tag"`
	RoutingMark int    `json:"routing_mark"`
}
