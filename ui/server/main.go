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

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/LandDuck/merlin-box/global"
	logger "github.com/LandDuck/merlin-box/helper/log"
	"github.com/LandDuck/merlin-box/server"
	"github.com/LandDuck/merlin-box/tools"
)

// commandFunc 定义命令处理函数的类型
type commandFunc func(args []string) error

// command 结构体表示一个命令行命令，包括其描述和执行函数
type command struct {
	description string
	run         commandFunc
}

// printVersion 打印全局版本信息
func printVersion() {
	logger.Success(global.Version)
}

// printUsage 打印命令行工具的使用说明
func printUsage() {
	name := filepath.Base(os.Args[0])
	var lines []string
	lines = append(lines, fmt.Sprintf("Usage:\n  %s <command> [arguments]\n\nCommands:\n", name))
	for _, commandName := range []string{"version", "server", "tool"} {
		cmd := commands[commandName]
		lines = append(lines, fmt.Sprintf("  %-12s %s", commandName, cmd.description))
	}
	lines = append(lines, fmt.Sprintf("\nExamples:\n  %s version\n  %s server --port 80\n  %s tool <tool_name>", name, name, name))
	logger.Warn(strings.Join(lines, "\n"))
}

// commands 存储可用的命令及其处理函数
var commands = map[string]command{
	"version": {
		description: "Print the global version",
		run: func(args []string) error {
			if len(args) > 0 {
				logger.Warn("version command does not accept arguments: ", args)
				return fmt.Errorf("version command does not accept arguments")
			}
			logger.Debug("Running command: version")
			printVersion()
			return nil
		},
	},
	"server": {
		description: "Run the web service",
		run: func(args []string) error {
			logger.Debug("Running command: server with args: ", args)
			return server.RunServer(args)
		},
	},
	"tool": {
		description: "Run a tool entry function",
		run: func(args []string) error {
			logger.Debug("Running command: tool with args: ", args)
			return tools.RunTool(args)
		},
	},
}

// runCommand 根据命令行参数执行相应的命令
func runCommand(args []string) error {
	if len(args) == 0 {
		logger.Warn("No command provided")
		printUsage()
		return nil
	}

	cmd, ok := commands[args[0]]
	if !ok {
		logger.Error("unknown command: ", args[0], "\n", commandSummary())
		return fmt.Errorf("unknown command: %s\n\n%s", args[0], commandSummary())
	}

	return cmd.run(args[1:])
}

// commandSummary 返回可用命令的简要说明
func commandSummary() string {
	var names []string
	for name := range commands {
		names = append(names, name)
	}
	sort.Strings(names)
	return "Available commands: " + strings.Join(names, ", ")
}

// main 主函数, 用于启动命令行工具或服务器
func main() {

	// 设置当前工作目录
	workingDir, err := os.Getwd()
	if err != nil {
		logger.Error("Failed to get working directory: ", err)
		os.Exit(1)
	}
	// 需要跟 global.CoreDir 拼接一下， 并计算一个完整的路径
	// 因为开发模式下与生产模式下的路径不一样
	global.WorkingDir = filepath.Join(workingDir, global.CoreDir)

	// 启动
	if err := runCommand(os.Args[1:]); err != nil {
		logger.Error(err)
		os.Exit(1)
	}
}
