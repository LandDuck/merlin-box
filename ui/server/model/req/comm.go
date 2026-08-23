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

package req

// Login 登录请求结构体，包含用户名和密码
type Login struct {
	// Username 用户名
	Username string `json:"username" validate:"required,min=5,max=16,usernamefmt"`
	// Password 密码
	Password string `json:"password" validate:"required,min=6,max=32,passwordfmt"`
}

// ChangePassword 修改密码请求结构体
type ChangePassword struct {
	// OldPassword 旧密码（用于验证身份）
	OldPassword string `json:"old_password" validate:"required,min=6,max=32,passwordfmt"`
	// Password 新密码
	Password string `json:"password" validate:"required,min=6,max=32,passwordfmt"`
}

// SaveDeviceControlConfig 保存设备控制配置请求结构体
type SaveDeviceControlConfig struct {
	// Blacklist 黑名单 MAC 地址, 一行一个
	Blacklist string `json:"blacklist"`
	// Whitelist 白名单 MAC 地址, 一行一个
	Whitelist string `json:"whitelist"`
}

// SaveIP4ControlConfig 保存 IPv4 控制配置请求结构体
type SaveIP4ControlConfig struct {
	// Blacklist 黑名单 IPv4 地址, 一行一个
	Blacklist string `json:"blacklist"`
	// Whitelist 白名单 IPv4 地址, 一行一个
	Whitelist string `json:"whitelist"`
}

// SaveIP6ControlConfig 保存 IPv6 控制配置请求结构体
type SaveIP6ControlConfig struct {
	// Blacklist 黑名单 IPv6 地址, 一行一个
	Blacklist string `json:"blacklist"`
	// Whitelist 白名单 IPv6 地址, 一行一个
	Whitelist string `json:"whitelist"`
}

// SaveDomainControlConfig 保存域名控制配置请求结构体
type SaveDomainControlConfig struct {
	// Blocklist 域名屏蔽列表, 一行一个
	Blocklist string `json:"blocklist"`
	// Blacklist 域名黑名单列表, 一行一个
	Blacklist string `json:"blacklist"`
}

// AddNode 添加节点请求结构体
type AddNode struct {
	// Type 节点类型，如 naive、shadowsocks 等
	Type string `json:"type" validate:"required"`
	// Data 节点数据，前端序列化后的 JSON 字符串
	Data string `json:"data" validate:"required"`
}
