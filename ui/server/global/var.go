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

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

var serviceLogMu sync.RWMutex

// ServiceRunning 标记当前是否有脚本在执行
var ServiceRunning bool

// SetServiceRunning 设置脚本运行状态
func SetServiceRunning(running bool) {
	serviceLogMu.Lock()
	defer serviceLogMu.Unlock()
	ServiceRunning = running
}

// IsServiceRunning 当前是否有脚本在执行
func IsServiceRunning() bool {
	serviceLogMu.RLock()
	defer serviceLogMu.RUnlock()
	return ServiceRunning
}

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

// DoNotDeleteFiles 不允许删除的配置文件列表
var DoNotDeleteFiles = []string{
	"site-blocklist.txt",
	"site-blacklist.txt",
	"site-whitelist.txt",
	"hosts.txt",
}

// EnvDev 开发环境
// EnvProd 生产环境
const (
	EnvDev      string = "development"
	EnvProd     string = "production"
	DefaultPort int    = 8080
)

// CurrentEnv 当前环境变量，默认为开发环境
var CurrentEnv = EnvDev

// WorkingDir 当前工作目录
var WorkingDir string

// Version 程序版本号，可在构建时通过 -ldflags 覆盖
var Version = "0.0.1"

// AuthTokenExpireMinutes token 过期时间（分钟）
var authToken string
var authUsername string

// authExpireAt token 过期时间
var authExpireAt time.Time

// authMu 用于保护 authToken 和 authExpireAt 的读写锁
var authMu sync.RWMutex

// AuthTokenExpireMinutes token 过期时间（分钟）
func IssueAuthToken(username string) (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}

	token := hex.EncodeToString(buffer)
	authMu.Lock()
	authToken = token
	authUsername = username
	authExpireAt = time.Now().Add(time.Duration(AuthTokenExpireMinutes) * time.Minute)
	authMu.Unlock()
	return token, nil
}

// ValidateAndRefreshAuthToken 验证 token 是否有效，并刷新过期时间
func ValidateAndRefreshAuthToken(token string) bool {
	now := time.Now()

	authMu.Lock()
	defer authMu.Unlock()
	if token == "" || token != authToken || now.After(authExpireAt) {
		return false
	}

	authExpireAt = now.Add(time.Duration(AuthTokenExpireMinutes) * time.Minute)
	return true
}

// RevokeAuthToken 撤销 token
func RevokeAuthToken(token string) {
	authMu.Lock()
	defer authMu.Unlock()
	if token == authToken {
		authToken = ""
		authUsername = ""
		authExpireAt = time.Time{}
	}
}

// GetAuthUsername 获取当前 token 对应的用户名
func GetAuthUsername(token string) string {
	authMu.RLock()
	defer authMu.RUnlock()
	if token == "" || token != authToken || time.Now().After(authExpireAt) {
		return ""
	}
	return authUsername
}
