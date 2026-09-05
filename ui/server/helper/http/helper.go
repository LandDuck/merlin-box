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

package http

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/LandDuck/merlin-box/model/resp"

	"golang.org/x/net/proxy"
)

// ResponseResult 返回统一的响应结构体，包含状态码、消息和数据
// T 是一个具体的业务数据，当code为0时，应该返回Data
// code 状态码，0表示成功，非0表示失败
// msg 消息，通常用于描述错误信息或提示信息
// data 具体的业务数据，类型为泛型T
func ResponseResult[T any](code int, msg string, data T) resp.BaseResponse[T] {
	return resp.BaseResponse[T]{
		Code: code,
		Msg:  msg,
		Data: data,
	}
}

// ResponseSuccess 返回统一的成功响应结构体，包含状态码、消息和数据
// T 是一个具体的业务数据，当code为0时，应该返回Data
// data 具体的业务数据，类型为泛型T
func ResponseSuccess[T any](response http.ResponseWriter, data T) {
	_ = json.NewEncoder(response).Encode(resp.BaseResponse[T]{
		Code: 0,
		Msg:  "success",
		Data: data,
	})
}

// ResponseFailure 返回统一的失败响应结构体，包含状态码、消息和数据
// msg 消息，通常用于描述错误信息或提示信息
func ResponseFailure(response http.ResponseWriter, msg string) {
	_ = json.NewEncoder(response).Encode(resp.BaseResponse[any]{
		Code: 10013,
		Msg:  msg,
	})
}

// ResponseRequireLogin 返回统一的需要登录响应结构体，包含状态码、消息和数据
// msg 消息，通常用于描述错误信息或提示信息
func ResponseRequireLogin(response http.ResponseWriter) {
	_ = json.NewEncoder(response).Encode(resp.BaseResponse[any]{
		Code: 10014,
		Msg:  "未授权或登录已过期",
	})
}

var socks5ProxyCache sync.Map // key: proxyURL, value: *http.Transport

// TestDelay 用于测试到一个域名的延时, 到达即可,  不需要下载数据. 同时支持使用 socks 代理
func TestDelay(url string, useProxy bool) int {
	// 只测试连接和首包响应头，不下载 body
	client := &http.Client{
		Timeout: 6 * time.Second,
	}
	if useProxy {
		proxyUrl := "socks5://127.0.0.1:65001"
		proxyTransport, err := getSocks5Proxy(proxyUrl)
		if err != nil {
			return -1
		}
		client.Transport = proxyTransport
	}

	// 记录开始时间
	start := time.Now()
	req, err := http.NewRequest(http.MethodHead, url, nil)
	if err != nil {
		return -1
	}
	resp, err := client.Do(req)
	if err != nil {
		return -1
	}
	defer resp.Body.Close()
	// 记录结束时间
	duration := time.Since(start)
	return int(duration.Milliseconds())
}

func getSocks5Proxy(proxyURL string) (*http.Transport, error) {
	if transport, ok := socks5ProxyCache.Load(proxyURL); ok {
		return transport.(*http.Transport), nil
	}

	transport, err := newSocks5Proxy(proxyURL)
	if err != nil {
		return nil, err
	}

	realTransport, _ := socks5ProxyCache.LoadOrStore(proxyURL, transport)
	return realTransport.(*http.Transport), nil
}

// newSocks5Proxy 创建一个支持 socks5 代理的 http.Transport
func newSocks5Proxy(proxyURL string) (*http.Transport, error) {
	u, err := url.Parse(proxyURL)
	if err != nil {
		return nil, err
	}

	dialer, err := proxy.FromURL(u, proxy.Direct)
	if err != nil {
		return nil, err
	}

	return &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			// 通过 socks5 连接目标地址
			return dialer.Dial(network, addr)
		},
		TLSHandshakeTimeout: 10 * time.Second,
		IdleConnTimeout:     30 * time.Second,
		DisableKeepAlives:   false,
	}, nil
}
