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

package tools

import (
	"fmt"
	logger "merlin-box-ui/helper/log"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// toolFunc 定义工具函数的类型
type toolFunc func(args []string) error

// toolRegistry 存储已注册的工具函数
var toolRegistry = map[string]toolFunc{}

// init 注册工具函数到工具注册表
func init() {
	// 将订阅链接转换为sinbbox的配置
	toolRegistry["sub2box"] = func(args []string) error {
		if len(args) == 0 {
			//logger.Warn("tool sub2box requires --url argument; optional --output. Example: tool sub2box --url <https://example.com> --output /tmp/output")
			return fmt.Errorf("tool sub2box requires --url argument; optional --output")
		}

		// 读取 --url 参数
		var url string
		for i, arg := range args {
			if arg == "--url" && i+1 < len(args) {
				url = args[i+1]
				break
			}
		}
		if url == "" {
			logger.Error("tool sub2box requires --url argument")
			return fmt.Errorf("tool sub2box requires --url argument")
		}

		// 读取 --output 参数 (可选)
		var output string
		for i, arg := range args {
			if arg == "--output" && i+1 < len(args) {
				output = args[i+1]
				break
			}
		}

		// 调用 Sub2box 函数处理 URL 和输出路径
		Sub2box(url, output)

		return nil
	}
}

// printToolUsage 打印工具使用说明
func printToolUsage() {
	logger.Warn("Usage:\n  ", filepath.Base(os.Args[0]), " tool <tool-name> [arguments]\n\nAvailable tools:\n  ", toolNames())
}

// toolNames 返回已注册工具的名称列表
func toolNames() string {
	var names []string
	for name := range toolRegistry {
		names = append(names, name)
	}
	sort.Strings(names)
	return strings.Join(names, ", ")
}

// RunTool 执行指定的工具
func RunTool(args []string) error {
	if len(args) == 0 {
		logger.Warn("No tool specified")
		printToolUsage()
		return nil
	}

	toolName := args[0]
	tool, ok := toolRegistry[toolName]
	if !ok {
		logger.Error("unknown tool: ", toolName, "\nAvailable tools: ", toolNames())
		return fmt.Errorf("unknown tool: %s\nAvailable tools: %s", toolName, toolNames())
	}

	logger.Debug("Executing tool: ", toolName)
	return tool(args[1:])
}
