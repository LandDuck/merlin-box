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
	"merlin-box-ui/global"
	dbHelper "merlin-box-ui/helper/db"
	httpHelper "merlin-box-ui/helper/http"
	validateHelper "merlin-box-ui/helper/validate"
	"merlin-box-ui/model/req"
	"net/http"
	"strings"
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
