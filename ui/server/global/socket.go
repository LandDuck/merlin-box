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

// LogHub 管理所有 WebSocket 日志订阅者
type logHub struct {
	mu          sync.RWMutex
	subscribers map[chan string]struct{}
}

var LogHub = &logHub{
	subscribers: make(map[chan string]struct{}),
}

// Subscribe 注册一个订阅频道，返回接收日志的只读 channel
func (h *logHub) Subscribe() <-chan string {
	ch := make(chan string, 256)
	h.mu.Lock()
	h.subscribers[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

// Unsubscribe 取消订阅并关闭 channel
func (h *logHub) Unsubscribe(ch <-chan string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for k := range h.subscribers {
		if k == ch {
			delete(h.subscribers, k)
			close(k)
			return
		}
	}
}

// Broadcast 向所有订阅者广播一条日志
func (h *logHub) Broadcast(line string) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.subscribers {
		select {
		case ch <- line:
		default:
		}
	}
}

// AppendServiceLog 追加脚本输出日志并广播给所有 WebSocket 客户端
func AppendServiceLog(line string) {
	LogHub.Broadcast(line)
}
