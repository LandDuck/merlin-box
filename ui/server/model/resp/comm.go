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

package resp

// BaseResponse 统一的响应结构体，包含状态码、消息和数据
// T 是一个具体的业务数据，当code为0时，应该返回Data
type BaseResponse[T any] struct {
	// Code 状态码，0表示成功，非0表示失败
	Code int `json:"code"`
	// Msg 消息，通常用于描述错误信息或提示信息
	Msg string `json:"msg"`
	// Data 具体的业务数据，类型为泛型T
	Data T `json:"data"`
}

// StatusResponse 系统状态响应结构体，包含请求耗时、状态码和请求路径
type StatusResponse struct {
	// Duration 系统运行时间，s
	Duration int `json:"duration"`
	// Status 状态码，0 未启动，1 正在运行
	Status int `json:"status"`
	// WorkingDir merlin-box 的路径
	WorkingDir string `json:"workingDir"`
	// DomesticDelay 国内延迟 ms
	// DomesticDelay int `json:"domesticDelay"`
	// InternationalDelay 国际延迟 ms
	// InternationalDelay int `json:"internationalDelay"`
}

// DelayResponse 延迟响应结构体，包含国内和国际延迟
type DelayResponse struct {
	// DomesticDelay 国内延迟 ms
	DomesticDelay int `json:"domesticDelay"`
	// InternationalDelay 国际延迟 ms
	InternationalDelay int `json:"internationalDelay"`
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
	// TcpFastOpen 是否启用 TCP Fast Open，0 禁用，1 仅启用客户端，3 启用客户端和服务端
	TcpFastOpen int `json:"tcpFastOpen"`
}
