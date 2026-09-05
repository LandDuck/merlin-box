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
