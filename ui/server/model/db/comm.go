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

// Database 数据库结构体，包含管理员列表
type Database struct {
	// Managers 管理员列表
	Managers []Manager `json:"managers"`
	// Device 设备信息
	Device DeviceInfo `json:"device"`
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
