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

package log

import "fmt"

const (
	reset  = "\033[0m"
	red    = "\033[31m"
	green  = "\033[32m"
	yellow = "\033[33m"
	blue   = "\033[34m"
)

// Debug 打印调试信息
func Debug(v ...interface{}) {
	printColor(blue, v...)
}

// Warn 打印警告信息
func Warn(v ...interface{}) {
	printColor(yellow, v...)
}

// Error 打印错误信息
func Error(v ...interface{}) {
	printColor(red, v...)
}

// Success 打印成功信息
func Success(v ...interface{}) {
	printColor(green, v...)
}

// printColor 打印带颜色的日志信息
func printColor(color string, v ...interface{}) {
	fmt.Printf("%s%s%s\n", color, fmt.Sprint(v...), reset)
}
