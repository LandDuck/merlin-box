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

package handlers

import (
	"bufio"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/LandDuck/merlin-box/global"
	dbHelper "github.com/LandDuck/merlin-box/helper/db"
	httpHelper "github.com/LandDuck/merlin-box/helper/http"
	"github.com/LandDuck/merlin-box/model/resp"
)

// Delay 返回测速延时
func Delay(response http.ResponseWriter, request *http.Request) {
	// 测速
	var domesticDelay = -1
	var internationalDelay = -1
	if global.CurrentEnv == global.EnvDev {
		//internationalDelay = httpHelper.TestDelay("https://www.google.com", false)
	} else {
		domesticDelay = httpHelper.TestDelay("https://www.baidu.com", false)
		internationalDelay = httpHelper.TestDelay("https://www.google.com", true)
	}
	httpHelper.ResponseSuccess(response, resp.DelayResponse{
		DomesticDelay:      domesticDelay,
		InternationalDelay: internationalDelay,
	})
}

// Status 返回系统当前状态
func Status(response http.ResponseWriter, request *http.Request) {

	// 判断是否存在 /tmp/merlin-box.pid 文件，如果存在读取创建时间并与当前时间比较，获取相差的秒数。
	var path string
	if global.CurrentEnv == global.EnvDev {
		path = "./merlin-box.pid"
	} else {
		path = "/tmp/merlin-box.pid"
	}

	var status int
	var duration int

	// 检查文件是否存在
	if _, err := os.Stat(path); os.IsNotExist(err) {
		status = 0
	} else {
		status = 1
	}
	fileInfo, err := os.Stat(path)
	if err != nil {
		status = 0
	} else {
		// 获取文件的创建时间
		creationTime := fileInfo.ModTime()
		// 计算当前时间与创建时间的差值，单位为秒
		duration = int((time.Now().Sub(creationTime)).Seconds())
		status = 1
	}

	httpHelper.ResponseSuccess(response, resp.StatusResponse{
		WorkingDir: global.WorkingDir,
		Duration:   duration,
		Status:     status,
	})
}

// runServiceScriptAsync 异步执行 merlin-box.sh，并持续追加日志到全局变量
func runServiceScriptAsync(action string, args ...string) error {
	scriptPath := filepath.Join(global.WorkingDir, "merlin-box.sh")
	if _, err := os.Stat(scriptPath); err != nil {
		return fmt.Errorf("脚本不存在: %s: %w", scriptPath, err)
	}

	if global.IsServiceRunning() {
		return fmt.Errorf("另一个服务操作正在执行中，请稍后再试")
	}

	global.SetServiceRunning(true)

	go func() {
		defer global.SetServiceRunning(false)

		commandArgs := append([]string{scriptPath, action}, args...)
		cmd := exec.Command("bash", commandArgs...)
		cmd.Dir = global.WorkingDir

		stdout, err := cmd.StdoutPipe()
		if err != nil {
			global.AppendServiceLog("[error] stdout pipe 创建失败: " + err.Error() + "\n")
			return
		}
		stderr, err := cmd.StderrPipe()
		if err != nil {
			global.AppendServiceLog("[error] stderr pipe 创建失败: " + err.Error() + "\n")
			return
		}

		if err := cmd.Start(); err != nil {
			global.AppendServiceLog("[error] 启动脚本失败: " + err.Error() + "\n")
			return
		}

		stdOutReader := bufio.NewReader(stdout)
		stdErrReader := bufio.NewReader(stderr)

		finished := make(chan error, 1)
		go func() {
			finished <- cmd.Wait()
		}()

		go func() {
			for {
				line, err := stdOutReader.ReadString('\n')
				if len(line) > 0 {
					global.AppendServiceLog(line)
				}
				if err != nil {
					break
				}
			}
		}()

		go func() {
			for {
				line, err := stdErrReader.ReadString('\n')
				if len(line) > 0 {
					global.AppendServiceLog(line)
				}
				if err != nil {
					break
				}
			}
		}()

		if err := <-finished; err != nil {
			global.AppendServiceLog("[error] 执行 " + action + " 失败: " + err.Error() + "\n" + strings.Join(args, " "))
		}
	}()

	return nil
}

// runServiceScript 执行 merlin-box.sh 并返回输出
func runServiceScript(args ...string) (string, error) {
	scriptPath := filepath.Join(global.WorkingDir, "merlin-box.sh")
	if _, err := os.Stat(scriptPath); err != nil {
		return "", fmt.Errorf("脚本不存在: %s: %w", scriptPath, err)
	}

	commandArgs := append([]string{scriptPath}, args...)
	cmd := exec.Command("bash", commandArgs...)
	cmd.Dir = global.WorkingDir

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("执行脚本失败: %w", err)
	}
	return string(output), nil
}

// Start 启动 merlin-box 服务，并异步返回脚本输出日志
func Start(w http.ResponseWriter, r *http.Request) {
	args, err := dbHelper.GetBaseConfigScriptArgs()
	if err != nil {
		httpHelper.ResponseFailure(w, "读取基础配置失败")
		return
	}
	if err := runServiceScriptAsync("start", args...); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	httpHelper.ResponseSuccess[any](w, nil)
}

// Stop 停止 merlin-box 服务，并异步返回脚本输出日志
func Stop(w http.ResponseWriter, r *http.Request) {
	if err := runServiceScriptAsync("stop"); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	httpHelper.ResponseSuccess[any](w, nil)
}

// Restart 重启 merlin-box 服务，并异步返回脚本输出日志
func Restart(w http.ResponseWriter, r *http.Request) {
	//restart 1 1 0 0 0 #显式参数重启：IPv6 QUIC拦截 UDP 自身代理 TcpFastOpen
	//读取db.json， 将 baseConfig 中的 值读过来，如果没有相关的值，使用上面的默认值
	args, err := dbHelper.GetBaseConfigScriptArgs()
	if err != nil {
		httpHelper.ResponseFailure(w, "读取基础配置失败")
		return
	}
	if err := runServiceScriptAsync("restart", args...); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	httpHelper.ResponseSuccess[any](w, nil)
}

// RestartUI 重启 merlin-box-ui 服务
func RestartUI(w http.ResponseWriter, r *http.Request) {
	if err := runServiceScriptAsync("server", "restart"); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	httpHelper.ResponseSuccess[any](w, nil)
}

// UpdateRules 更新规则文件，并异步返回脚本输出日志
func UpdateRules(w http.ResponseWriter, r *http.Request) {
	if err := runServiceScriptAsync("tool", "update_rules"); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	httpHelper.ResponseSuccess[any](w, nil)
}

// ShowDhcpClientList 返回 DHCP 客户端列表
func ShowDhcpClientList(w http.ResponseWriter, r *http.Request) {
	output, err := runServiceScript("tool", "show_devices")
	if err != nil {
		httpHelper.ResponseFailure(w, "获取 DHCP 客户端列表失败: "+err.Error())
		return
	}
	httpHelper.ResponseSuccess(w, output)
}
