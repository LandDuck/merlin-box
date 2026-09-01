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
	httpHelper "merlin-box-ui/helper/http"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
)

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// LogWS 处理 WebSocket 连接，向客户端实时推送服务日志。
// 认证方式：优先读 Authorization 请求头，其次读 URL query 参数 token。
func LogWS(w http.ResponseWriter, r *http.Request) {
	// 认证：Header 优先，其次 query param
	token := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimSpace(strings.TrimPrefix(token, "Bearer "))
	}
	if token == "" {
		token = strings.TrimSpace(r.URL.Query().Get("token"))
	}

	if !global.ValidateAndRefreshAuthToken(token) {
		httpHelper.ResponseRequireLogin(w)
		return
	}

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	ch := global.LogHub.Subscribe()
	defer global.LogHub.Unsubscribe(ch)

	// 监听来自客户端的关闭帧（忽略内容），同时转发日志
	closeCh := make(chan struct{})
	go func() {
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				close(closeCh)
				return
			}
		}
	}()

	for {
		select {
		case <-closeCh:
			return
		case line, ok := <-ch:
			if !ok {
				return
			}
			if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
				return
			}
		}
	}
}
