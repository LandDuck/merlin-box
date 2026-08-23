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
