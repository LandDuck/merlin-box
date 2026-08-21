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
	"merlin-box-ui/global"
	httpHelper "merlin-box-ui/helper/http"
	"merlin-box-ui/model/resp"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// Status 返回系统当前状态
func Status(response http.ResponseWriter, request *http.Request) {

	// 判断是否存在 /tmp/merlin-box.pid 文件，如果存在读取创建时间并与当前时间比较，获取相差的秒数。
	var path string
	if global.CurrentEnv == global.EnvDev {
		path = "./merlin-box.pid"
	} else {
		path = "/tmp/merlin-box.pid"
	}
	// 检查文件是否存在
	if _, err := os.Stat(path); os.IsNotExist(err) {
		httpHelper.ResponseSuccess(response, resp.StatusResponse{
			Duration: 0,
			Status:   0,
		})
		return
	}
	fileInfo, err := os.Stat(path)
	if err != nil {
		httpHelper.ResponseFailure(response, "无法获取文件信息")
		return
	}
	// 获取文件的创建时间
	creationTime := fileInfo.ModTime()
	// 计算当前时间与创建时间的差值，单位为秒
	duration := int((time.Now().Sub(creationTime)).Seconds())
	// 测速
	var domesticDelay = -1
	var internationalDelay = -1
	if global.CurrentEnv == global.EnvDev {
		//internationalDelay = httpHelper.TestDelay("https://www.google.com", false)
	} else {
		domesticDelay = httpHelper.TestDelay("https://www.baidu.com", false)
		internationalDelay = httpHelper.TestDelay("https://www.google.com", true)
	}
	httpHelper.ResponseSuccess(response, resp.StatusResponse{
		WorkingDir:         global.WorkingDir,
		Duration:           duration,
		Status:             1,
		DomesticDelay:      domesticDelay,
		InternationalDelay: internationalDelay,
	})
}

// runServiceScriptAsync 异步执行 merlin-box.sh，并持续追加日志到全局变量
func runServiceScriptAsync(action string) error {
	scriptPath := filepath.Join(global.WorkingDir, "merlin-box.sh")
	if _, err := os.Stat(scriptPath); err != nil {
		return fmt.Errorf("脚本不存在: %s: %w", scriptPath, err)
	}

	if global.IsServiceRunning() {
		return fmt.Errorf("另一个服务操作正在执行中，请稍后再试")
	}

	global.SetServiceLog("")
	global.SetServiceRunning(true)

	go func() {
		defer global.SetServiceRunning(false)

		cmd := exec.Command("bash", scriptPath, action)
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
			global.AppendServiceLog("[error] 执行 " + action + " 失败: " + err.Error() + "\n")
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
	if err := runServiceScriptAsync("start"); err != nil {
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
	if err := runServiceScriptAsync("restart"); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	httpHelper.ResponseSuccess[any](w, nil)
}

// GetServiceLog 返回最近一次脚本执行日志
func GetServiceLog(w http.ResponseWriter, r *http.Request) {
	httpHelper.ResponseSuccess(w, global.GetServiceLog())
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
