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
	"encoding/json"
	"merlin-box-ui/global"
	dbHelper "merlin-box-ui/helper/db"
	httpHelper "merlin-box-ui/helper/http"
	validateHelper "merlin-box-ui/helper/validate"
	"merlin-box-ui/model/req"
	"merlin-box-ui/model/resp"
	"net/http"
	"os"
	"strings"
	"time"
)

// Logout 处理登出请求
func Logout(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimSpace(strings.TrimPrefix(token, "Bearer "))
	}
	global.RevokeAuthToken(token)
	httpHelper.ResponseSuccess(w, "登出成功")
}

// Login 处理登录请求
func Login(w http.ResponseWriter, r *http.Request) {

	// 绑定请求数据并进行验证
	requestData, ok := validateHelper.BindAndValidate[req.Login](w, r)
	if !ok {
		return
	}

	// 业务逻辑

	matched, err := dbHelper.CheckManager(requestData.Username, requestData.Password)
	if err != nil {
		httpHelper.ResponseFailure(w, "读取管理员配置失败")
		return
	}

	if !matched {
		httpHelper.ResponseFailure(w, "用户名或密码错误")
		return
	}

	token, err := global.IssueAuthToken()
	if err != nil {
		httpHelper.ResponseFailure(w, "生成登录凭证失败")
		return
	}

	httpHelper.ResponseSuccess(w, token)
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
	domesticDelay := httpHelper.TestDelay("https://www.baidu.com", false)
	var internationalDelay = -1
	if global.CurrentEnv == global.EnvDev {
		internationalDelay = httpHelper.TestDelay("https://www.google.com", false)
	} else {
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

func SavePath(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]any{
		"success": true,
	})
}

func Test(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]any{
		"success": true,
	})
}

// Init 初始化接口，返回是否已登录状态
func Init(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimSpace(strings.TrimPrefix(token, "Bearer "))
	}

	if global.ValidateAndRefreshAuthToken(token) {
		httpHelper.ResponseSuccess(w, 1)
		return
	}

	httpHelper.ResponseSuccess(w, 0)
}
