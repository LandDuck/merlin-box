//go:build !development

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

package global

// DbPath 是数据库文件的路径，生产环境下使用相对路径 "./db/db.json"
const DbPath = "./db/db.json"

// ResDir 目录
const ResDir = "./res"

// CoreDir 目录
const CoreDir = "."

// AuthTokenExpireMinutes 是 token 过期时间（分钟）
const AuthTokenExpireMinutes = 20
