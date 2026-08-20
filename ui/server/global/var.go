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

// EnvDev 开发环境
// EnvProd 生产环境
const (
	EnvDev      string = "development"
	EnvProd     string = "production"
	DefaultPort int    = 8080
)

// CurrentEnv 当前环境变量，默认为开发环境
var CurrentEnv = EnvDev

// Version 程序版本号，可在构建时通过 -ldflags 覆盖
var Version = "0.0.1"

// AuthTokenExpireMinutes token 过期时间（分钟）
var authToken string

// authExpireAt token 过期时间
var authExpireAt time.Time

// authMu 用于保护 authToken 和 authExpireAt 的读写锁
var authMu sync.RWMutex

// AuthTokenExpireMinutes token 过期时间（分钟）
func IssueAuthToken() (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}

	token := hex.EncodeToString(buffer)
	authMu.Lock()
	authToken = token
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
