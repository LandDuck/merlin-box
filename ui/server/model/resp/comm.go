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
	DomesticDelay int `json:"domesticDelay"`
	// InternationalDelay 国际延迟 ms
	InternationalDelay int `json:"internationalDelay"`
}
