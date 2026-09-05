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

import "sync"

var serviceLogMu sync.RWMutex

// ServiceRunning 标记当前是否有脚本在执行
var ServiceRunning bool

// SetServiceRunning 设置脚本运行状态
func SetServiceRunning(running bool) {
	serviceLogMu.Lock()
	defer serviceLogMu.Unlock()
	ServiceRunning = running
}

// IsServiceRunning 当前是否有脚本在执行
func IsServiceRunning() bool {
	serviceLogMu.RLock()
	defer serviceLogMu.RUnlock()
	return ServiceRunning
}
