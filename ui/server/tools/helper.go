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

package tools

import (
	"context"
	"crypto/md5"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	logger "github.com/LandDuck/merlin-box/helper/log"
)

// left 返回字符串前 n 个字符，不足 n 则原样返回。
func left(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

// firstNonEmpty 返回参数中第一个非空字符串。
func firstNonEmpty(items ...string) string {
	for _, item := range items {
		if item != "" {
			return item
		}
	}
	return ""
}

// withDefault 在 value 为空时返回 fallback。
func withDefault(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

// asString 将常见类型尽量转换为字符串表示。
func asString(v any) string {
	switch x := v.(type) {
	case string:
		return x
	case fmt.Stringer:
		return x.String()
	case int:
		return strconv.Itoa(x)
	case int64:
		return strconv.FormatInt(x, 10)
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	case bool:
		if x {
			return "true"
		}
		return "false"
	default:
		return ""
	}
}

// asBool 将常见值转换为布尔值。
func asBool(v any) bool {
	switch x := v.(type) {
	case bool:
		return x
	case string:
		return strings.EqualFold(x, "true")
	default:
		return false
	}
}

// asMap 将 interface{} 安全转换为 map[string]any。
func asMap(v any) map[string]any {
	if v == nil {
		return nil
	}
	if m, ok := v.(map[string]any); ok {
		return m
	}
	if m, ok := v.(map[any]any); ok {
		out := make(map[string]any, len(m))
		for k, val := range m {
			out[asString(k)] = val
		}
		return out
	}
	return nil
}

// toInt 将常见数值类型或数字字符串转换为 int。
func toInt(v any) (int, error) {
	switch x := v.(type) {
	case int:
		return x, nil
	case int64:
		return int(x), nil
	case float64:
		return int(x), nil
	case string:
		if x == "" {
			return 0, errors.New("empty")
		}
		n, err := strconv.Atoi(x)
		return n, err
	default:
		return 0, fmt.Errorf("unsupported int type %T", v)
	}
}

// mustIntDefault 尝试转 int，失败时返回默认值。
func mustIntDefault(v any, fallback int) int {
	if v == nil {
		return fallback
	}
	if n, err := toInt(v); err == nil {
		return n
	}
	return fallback
}

// isLocalIP 判断节点地址是否属于本地/私网/回环等应跳过的地址。
func isLocalIP(server string) bool {
	if strings.TrimSpace(server) == "" {
		return false
	}

	host := strings.TrimSpace(server)
	host = strings.TrimPrefix(host, "[")
	host = strings.TrimSuffix(host, "]")
	if host == "" {
		return false
	}
	switch strings.ToLower(host) {
	case "localhost", "localhost.localdomain":
		return true
	}

	if ip := net.ParseIP(host); ip != nil {
		return isPrivateLikeIP(ip)
	}

	ips, err := net.LookupIP(host)
	if err != nil {
		return false
	}
	return slices.ContainsFunc(ips, isPrivateLikeIP)
}

// isPrivateLikeIP 判断 IP 是否为私网、回环、链路本地、多播或未指定地址。
func isPrivateLikeIP(ip net.IP) bool {
	if ip == nil {
		return false
	}
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() || ip.IsUnspecified() {
		return true
	}
	if ip4 := ip.To4(); ip4 != nil {
		privateCIDRs := []string{
			"10.0.0.0/8",
			"172.16.0.0/12",
			"192.0.0.0/8",
		}
		for _, cidr := range privateCIDRs {
			_, n, _ := net.ParseCIDR(cidr)
			if n.Contains(ip4) {
				return true
			}
		}
		return false
	}
	privateV6CIDRs := []string{
		"fc00::/7",
	}
	for _, cidr := range privateV6CIDRs {
		_, n, _ := net.ParseCIDR(cidr)
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

// fetchSubscription 拉取订阅链接内容并返回去除首尾空白后的文本。
func fetchSubscription(rawURL string, timeout time.Duration) (string, error) {
	headers := map[string]string{
		"User-Agent": "clash.meta",
	}
	logger.Success("正在拉取订阅: " + rawURL)
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return "", err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("HTTP 请求失败: %s", resp.Status)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(body)), nil
}

// isBase64 粗略判断字符串是否为合法 Base64 文本。
func isBase64(s string) bool {
	s = strings.TrimSpace(s)
	if s == "" {
		return false
	}
	if m := len(s) % 4; m != 0 {
		s += strings.Repeat("=", 4-m)
	}
	_, err := base64.StdEncoding.Strict().DecodeString(s)
	return err == nil
}

// decodeBase64Sub 解码 Base64 订阅并拆分为逐行 URI 列表。
func decodeBase64Sub(content string) ([]string, error) {
	content = strings.ReplaceAll(content, "\n", "")
	content = strings.ReplaceAll(content, "\r", "")
	content = strings.TrimSpace(content)
	if m := len(content) % 4; m != 0 {
		content += strings.Repeat("=", 4-m)
	}
	decoded, err := base64.StdEncoding.DecodeString(content)
	if err != nil {
		return nil, fmt.Errorf("Base64 解码失败: %w", err)
	}
	lines := strings.Split(string(decoded), "\n")
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			out = append(out, line)
		}
	}
	return out, nil
}

// getMD5 计算字符串的 MD5 哈希并返回十六进制表示。
func getMD5(s string) string {
	hash := md5.Sum([]byte(s))
	return hex.EncodeToString(hash[:])
}

// isDomain 判断字符串是否为域名（非空且非 IP 地址）。
func isDomain(s string) bool {
	if s == "" {
		return false
	}
	if net.ParseIP(s) != nil {
		return false
	}
	return true
}

// domainToIp 将域名解析为 IP 地址，若解析失败则返回原域名。
func domainToIp(domain string) string {
	var resolver *net.Resolver
	// 检测本机 53 端口是否监听
	conn, err := net.DialTimeout("tcp", "127.0.0.1:53", 500*time.Millisecond)
	if err == nil {
		_ = conn.Close()
		// 本机存在 DNS 服务，强制使用 127.0.0.1:53
		resolver = &net.Resolver{
			PreferGo: true,
			Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
				d := net.Dialer{}
				return d.DialContext(ctx, "udp", "127.0.0.1:53")
			},
		}
	} else {
		// 使用系统默认解析策略
		resolver = net.DefaultResolver
	}
	ips, err := resolver.LookupIPAddr(context.Background(), domain)
	if err != nil {
		return ""
	}
	// 优先 IPv6
	for _, ip := range ips {
		if ip.IP.To4() == nil {
			return ip.IP.String()
		}
	}
	// 没有 IPv6，再使用 IPv4
	for _, ip := range ips {
		if ip.IP.To4() != nil {
			return ip.IP.String()
		}
	}
	return ""
}
