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

package middleware

import (
	"merlin-box-ui/global"
	httpHelper "merlin-box-ui/helper/http"
	"net/http"
	"strings"
)

// Auth 是一个中间件函数，用于验证请求的身份认证信息
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/api/login" || r.URL.Path == "/api/init" {
			next.ServeHTTP(w, r)
			return
		}

		token := strings.TrimSpace(r.Header.Get("Authorization"))
		if strings.HasPrefix(token, "Bearer ") {
			token = strings.TrimSpace(strings.TrimPrefix(token, "Bearer "))
		}
		// WebSocket 握手时浏览器无法设置自定义 Header，从 query param 中读取
		if token == "" {
			token = strings.TrimSpace(r.URL.Query().Get("token"))
		}

		if !global.ValidateAndRefreshAuthToken(token) {
			//w.WriteHeader(http.StatusUnauthorized)
			httpHelper.ResponseRequireLogin(w)
			return
		}

		next.ServeHTTP(w, r)
	})
}
