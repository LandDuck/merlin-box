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

package main

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

const (
	reset  = "\033[0m"
	red    = "\033[31m"
	green  = "\033[32m"
	yellow = "\033[33m"
)

// colorize 根据当前输出是否为终端决定是否添加 ANSI 颜色。
func colorize(text, color string) string {
	if fi, err := os.Stdout.Stat(); err == nil && (fi.Mode()&os.ModeCharDevice) != 0 {
		return color + text + reset
	}
	return text
}

// printSuccess 输出成功级别提示信息。
func printSuccess(message string) {
	fmt.Println(colorize("[SUCCESS] "+message, green))
}

// printWarning 输出警告级别提示信息。
func printWarning(message string) {
	fmt.Println(colorize("[WARNING] "+message, yellow))
}

// printError 输出错误级别提示信息到标准错误。
func printError(message string) {
	fmt.Fprintln(os.Stderr, colorize("[ERROR] "+message, red))
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
	for _, ip := range ips {
		if isPrivateLikeIP(ip) {
			return true
		}
	}
	return false
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
			"192.168.0.0/16",
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
		"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
	}
	printSuccess("正在拉取订阅: " + rawURL)
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

// parseSS 解析 ss:// URI 并转换为 sing-box 的 shadowsocks outbound。
func parseSS(uri string) map[string]any {
	raw := uri
	defer func() {
		if recover() != nil {
			printWarning("跳过无法解析的 Shadowsocks URI: " + raw)
		}
	}()

	uri = strings.TrimPrefix(uri, "ss://")
	name := ""
	if idx := strings.LastIndex(uri, "#"); idx >= 0 {
		name, _ = url.QueryUnescape(uri[idx+1:])
		uri = uri[:idx]
	}

	if !strings.Contains(uri, "@") {
		printWarning("跳过无法解析的 Shadowsocks URI: " + uri)
		return nil
	}

	parts := strings.SplitN(uri, "@", 2)
	userinfo := parts[0]
	serverPart := parts[1]
	i := strings.LastIndex(serverPart, ":")
	if i <= 0 || i == len(serverPart)-1 {
		printWarning("跳过无法解析的 Shadowsocks URI: " + raw)
		return nil
	}
	server := serverPart[:i]
	port, err := strconv.Atoi(serverPart[i+1:])
	if err != nil {
		printWarning("跳过无法解析的 Shadowsocks URI: " + raw)
		return nil
	}

	if isLocalIP(server) {
		nodeName := name
		if nodeName == "" {
			nodeName = fmt.Sprintf("%s:%d", server, port)
		}
		printWarning(fmt.Sprintf("跳过本地 IP 节点: %s (%s)", nodeName, server))
		return nil
	}

	var method, password string
	if decoded, err := base64.RawURLEncoding.DecodeString(userinfo); err == nil && strings.Contains(string(decoded), ":") {
		mp := strings.SplitN(string(decoded), ":", 2)
		method, password = mp[0], mp[1]
	} else if decoded, err := base64.URLEncoding.DecodeString(userinfo); err == nil && strings.Contains(string(decoded), ":") {
		mp := strings.SplitN(string(decoded), ":", 2)
		method, password = mp[0], mp[1]
	} else {
		mp := strings.SplitN(userinfo, ":", 2)
		if len(mp) != 2 {
			printWarning("跳过无法解析的 Shadowsocks URI: " + raw)
			return nil
		}
		method, password = mp[0], mp[1]
	}

	tag := name
	if tag == "" {
		tag = fmt.Sprintf("ss-%s:%d", server, port)
	}
	return map[string]any{
		"type":        "shadowsocks",
		"tag":         tag,
		"server":      server,
		"server_port": port,
		"method":      method,
		"password":    password,
	}
}

// parseVMess 解析 vmess:// URI 并转换为 sing-box 的 vmess outbound。
func parseVMess(uri string) map[string]any {
	raw := uri
	b64 := strings.TrimPrefix(uri, "vmess://")
	if m := len(b64) % 4; m != 0 {
		b64 += strings.Repeat("=", 4-m)
	}
	decoded, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		printWarning("跳过无法解析的 VMess URI: " + raw)
		return nil
	}

	var data map[string]any
	if err := json.Unmarshal(decoded, &data); err != nil {
		printWarning("跳过无法解析的 VMess URI: " + raw)
		return nil
	}

	server := asString(data["add"])
	if server == "" {
		printWarning("跳过无法解析的 VMess URI: " + raw)
		return nil
	}
	if isLocalIP(server) {
		name := asString(data["ps"])
		if name == "" {
			name = server
		}
		printWarning(fmt.Sprintf("跳过本地 IP 节点: %s (%s)", name, server))
		return nil
	}

	port, err := toInt(data["port"])
	if err != nil {
		printWarning("跳过无法解析的 VMess URI: " + raw)
		return nil
	}
	tag := asString(data["ps"])
	if tag == "" {
		tag = "vmess-" + server
	}
	outbound := map[string]any{
		"type":        "vmess",
		"tag":         tag,
		"server":      server,
		"server_port": port,
		"uuid":        asString(data["id"]),
		"security":    withDefault(asString(data["scy"]), "auto"),
		"alter_id":    mustIntDefault(data["aid"], 0),
	}

	if asString(data["tls"]) == "tls" {
		serverName := withDefault(asString(data["sni"]), withDefault(asString(data["host"]), server))
		outbound["tls"] = map[string]any{
			"enabled":     true,
			"server_name": serverName,
		}
	}

	switch withDefault(asString(data["net"]), "tcp") {
	case "ws":
		transport := map[string]any{
			"type": "ws",
			"path": withDefault(asString(data["path"]), "/"),
		}
		if host := asString(data["host"]); host != "" {
			transport["headers"] = map[string]any{"Host": host}
		} else {
			transport["headers"] = map[string]any{}
		}
		outbound["transport"] = transport
	case "grpc":
		outbound["transport"] = map[string]any{
			"type":         "grpc",
			"service_name": asString(data["path"]),
		}
	}

	return outbound
}

// parseTrojan 解析 trojan:// URI 并转换为 sing-box 的 trojan outbound。
func parseTrojan(uri string) map[string]any {
	u, err := url.Parse(uri)
	if err != nil {
		printWarning("跳过无法解析的 Trojan URI: " + uri)
		return nil
	}
	password := ""
	if u.User != nil {
		password = u.User.Username()
	}
	server := u.Hostname()
	if server == "" {
		printWarning("跳过无法解析的 Trojan URI: " + uri)
		return nil
	}
	port := 443
	if p := u.Port(); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}
	name := u.Fragment
	if decoded, err := url.QueryUnescape(name); err == nil {
		name = decoded
	}
	if name == "" {
		name = "trojan-" + server
	}
	if isLocalIP(server) {
		printWarning(fmt.Sprintf("跳过本地 IP 节点: %s (%s)", name, server))
		return nil
	}
	sni := u.Query().Get("sni")
	if sni == "" {
		sni = server
	}
	return map[string]any{
		"type":        "trojan",
		"tag":         name,
		"server":      server,
		"server_port": port,
		"password":    password,
		"tls": map[string]any{
			"enabled":     true,
			"server_name": sni,
		},
	}
}

// parseVLess 解析 vless:// URI 并转换为 sing-box 的 vless outbound。
func parseVLess(uri string) map[string]any {
	u, err := url.Parse(uri)
	if err != nil {
		printWarning("跳过无法解析的 Vless URI: " + uri)
		return nil
	}
	uuid := ""
	if u.User != nil {
		uuid = u.User.Username()
	}
	server := u.Hostname()
	if server == "" {
		printWarning("跳过无法解析的 Vless URI: " + uri)
		return nil
	}
	port := 443
	if p := u.Port(); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}
	name := u.Fragment
	if decoded, err := url.QueryUnescape(name); err == nil {
		name = decoded
	}
	if name == "" {
		name = "vless-" + server
	}
	if isLocalIP(server) {
		printWarning(fmt.Sprintf("跳过本地 IP 节点: %s (%s)", name, server))
		return nil
	}

	query := u.Query()
	security := withDefault(query.Get("security"), "none")
	sni := withDefault(query.Get("sni"), server)
	flow := query.Get("flow")
	typ := withDefault(query.Get("type"), "tcp")
	path := withDefault(query.Get("path"), "/")
	host := query.Get("host")

	outbound := map[string]any{
		"type":        "vless",
		"tag":         name,
		"server":      server,
		"server_port": port,
		"uuid":        uuid,
		"flow":        flow,
	}

	if security == "tls" || security == "reality" {
		tls := map[string]any{
			"enabled":     true,
			"server_name": sni,
		}
		if security == "reality" {
			outbound["tag"] = asString(outbound["tag"]) + "（不安全）"
			tls["utls"] = map[string]any{
				"enabled":     true,
				"fingerprint": "chrome",
			}
			tls["reality"] = map[string]any{
				"enabled":    true,
				"public_key": query.Get("pbk"),
				"short_id":   query.Get("sid"),
			}
			printWarning("检测到 Reality 配置，已为节点启用 uTLS: " + asString(outbound["tag"]))
		}
		outbound["tls"] = tls
	}

	switch typ {
	case "ws":
		transport := map[string]any{
			"type": "ws",
			"path": path,
		}
		if host != "" {
			transport["headers"] = map[string]any{"Host": host}
		} else {
			transport["headers"] = map[string]any{}
		}
		outbound["transport"] = transport
	case "grpc":
		outbound["transport"] = map[string]any{
			"type":         "grpc",
			"service_name": path,
		}
	}

	return outbound
}

// parseURI 按协议分发 URI 到对应解析函数。
func parseURI(uri string) map[string]any {
	uri = strings.TrimSpace(uri)
	if uri == "" {
		return nil
	}
	switch {
	case strings.HasPrefix(uri, "ss://"):
		return parseSS(uri)
	case strings.HasPrefix(uri, "vmess://"):
		return parseVMess(uri)
	case strings.HasPrefix(uri, "trojan://"):
		return parseTrojan(uri)
	case strings.HasPrefix(uri, "vless://"):
		return parseVLess(uri)
	}

	proto := uri
	if i := strings.Index(uri, "://"); i > 0 {
		proto = strings.ToUpper(uri[:i])
	}
	printWarning("跳过未实现的转换协议: " + proto)
	return nil
}

// parseClashYAML 解析 Clash YAML 的 proxies 并转换为 sing-box outbounds。
func parseClashYAML(content string) []map[string]any {
	var data map[string]any
	if err := yaml.Unmarshal([]byte(content), &data); err != nil {
		printWarning("Clash YAML 解析失败: " + err.Error())
		return nil
	}

	proxiesAny, ok := data["proxies"]
	if !ok {
		return nil
	}
	proxies, ok := proxiesAny.([]any)
	if !ok {
		return nil
	}

	outbounds := make([]map[string]any, 0, len(proxies))
	for _, item := range proxies {
		p, ok := item.(map[string]any)
		if !ok {
			continue
		}
		t := asString(p["type"])
		tag := withDefault(asString(p["name"]), "unnamed")
		server := firstNonEmpty(asString(p["server"]), asString(p["host"]), asString(p["address"]))

		if server != "" && isLocalIP(server) {
			printWarning(fmt.Sprintf("跳过本地 IP 节点: %s (%s)", tag, server))
			continue
		}

		switch t {
		case "ss":
			port, err := toInt(p["port"])
			if err != nil {
				continue
			}
			outbounds = append(outbounds, map[string]any{
				"type":        "shadowsocks",
				"tag":         tag,
				"server":      server,
				"server_port": port,
				"method":      withDefault(asString(p["cipher"]), "aes-256-gcm"),
				"password":    asString(p["password"]),
			})
		case "vmess":
			port, err := toInt(p["port"])
			if err != nil {
				continue
			}
			ob := map[string]any{
				"type":        "vmess",
				"tag":         tag,
				"server":      server,
				"server_port": port,
				"uuid":        asString(p["uuid"]),
				"security":    withDefault(asString(p["cipher"]), "auto"),
				"alter_id":    mustIntDefault(p["alterId"], 0),
			}
			if asBool(p["tls"]) {
				ob["tls"] = map[string]any{
					"enabled":     true,
					"server_name": firstNonEmpty(asString(p["servername"]), server),
				}
			}
			if asString(p["network"]) == "ws" {
				wsOpts := asMap(p["ws-opts"])
				headers := asMap(wsOpts["headers"])
				if headers == nil {
					headers = map[string]any{}
				}
				ob["transport"] = map[string]any{
					"type":    "ws",
					"path":    withDefault(asString(wsOpts["path"]), "/"),
					"headers": headers,
				}
			}
			outbounds = append(outbounds, ob)
		case "trojan":
			port, err := toInt(p["port"])
			if err != nil {
				continue
			}
			outbounds = append(outbounds, map[string]any{
				"type":        "trojan",
				"tag":         tag,
				"server":      server,
				"server_port": port,
				"password":    asString(p["password"]),
				"tls": map[string]any{
					"enabled":     true,
					"server_name": firstNonEmpty(asString(p["sni"]), server),
				},
			})
		case "vless":
			port, err := toInt(p["port"])
			if err != nil {
				continue
			}
			ob := map[string]any{
				"type":        "vless",
				"tag":         tag,
				"server":      server,
				"server_port": port,
				"uuid":        asString(p["uuid"]),
				"flow":        asString(p["flow"]),
			}
			if asBool(p["tls"]) {
				tls := map[string]any{
					"enabled":     true,
					"server_name": firstNonEmpty(asString(p["servername"]), server),
				}
				reality := asMap(p["reality"])
				if len(reality) > 0 {
					ob["tag"] = asString(ob["tag"]) + "（不安全）"
					tls["utls"] = map[string]any{
						"enabled":     true,
						"fingerprint": "chrome",
					}
					tls["reality"] = map[string]any{
						"enabled":    true,
						"public_key": asString(reality["public_key"]),
						"short_id":   asString(reality["short_id"]),
					}
					printWarning("检测到 Reality 配置，已为节点启用 uTLS: " + asString(ob["tag"]))
				}
				ob["tls"] = tls
			}
			outbounds = append(outbounds, ob)
		default:
			printWarning("跳过不支持的 Clash 协议: " + t)
		}
	}
	return outbounds
}

// buildSingboxConfig 将解析后的 outbounds 组装成完整 sing-box 配置。
func buildSingboxConfig(outbounds []map[string]any) (map[string]any, error) {
	filtered := make([]map[string]any, 0, len(outbounds))
	for _, ob := range outbounds {
		if ob != nil {
			filtered = append(filtered, ob)
		}
	}
	if len(filtered) == 0 {
		return nil, errors.New("没有成功解析出任何节点")
	}

	config := map[string]any{
		"log": map[string]any{
			"disabled":  true,
			"level":     "error",
			"output":    "logs/singbox-bin.log",
			"timestamp": true,
		},
		"dns": map[string]any{
			"servers": []any{
				map[string]any{
					"type":       "hosts",
					"tag":        "hosts-dns",
					"predefined": map[string]any{},
				},
			},
		},
		"inbounds": []any{
			map[string]any{
				"type":        "socks",
				"tag":         "socks-in",
				"listen":      "::",
				"listen_port": 65001,
			},
			map[string]any{
				"type":        "tproxy",
				"tag":         "tproxy-in",
				"listen":      "::",
				"listen_port": 65002,
			},
			map[string]any{
				"type":        "redirect",
				"tag":         "redirect-in",
				"listen":      "::",
				"listen_port": 65003,
			},
		},
		"outbounds": filtered,
		"route": map[string]any{
			"rules": []any{},
			"final": filtered[0]["tag"],
		},
	}
	return config, nil
}

// convert 执行完整转换流程：拉取订阅、识别格式、解析节点并生成配置。
func convert(subscriptionURL string) (map[string]any, error) {
	content, err := fetchSubscription(subscriptionURL, 15*time.Second)
	if err != nil {
		return nil, err
	}

	outbounds := make([]map[string]any, 0)
	if strings.HasPrefix(content, "proxies:") || strings.Contains(left(content, 200), "proxies:") {
		printSuccess("检测到 Clash YAML 格式")
		outbounds = parseClashYAML(content)
	} else {
		normalized := strings.ReplaceAll(content, "\n", "")
		base64Like, _ := regexp.MatchString(`^[A-Za-z0-9+/=]+$`, normalized)
		if isBase64(content) || base64Like {
			printSuccess("检测到 Base64 格式")
			uris, err := decodeBase64Sub(content)
			if err != nil {
				return nil, err
			}
			printSuccess(fmt.Sprintf("共解析到 %d 条 URI", len(uris)))
			for _, uri := range uris {
				if ob := parseURI(uri); ob != nil {
					outbounds = append(outbounds, ob)
				}
			}
		} else {
			printSuccess("尝试按行解析 URI")
			for _, line := range strings.Split(content, "\n") {
				line = strings.TrimSpace(line)
				if line == "" {
					continue
				}
				if ob := parseURI(line); ob != nil {
					outbounds = append(outbounds, ob)
				}
			}
		}
	}

	printSuccess(fmt.Sprintf("成功转换 %d 个节点", len(outbounds)))
	return buildSingboxConfig(outbounds)
}

// main 处理命令行参数并输出转换后的 sing-box JSON。
func main() {
	if len(os.Args) < 2 {
		printWarning("用法: go run main.go <订阅链接> [输出文件]")
		printWarning("示例: go run main.go https://example.com/sub > config.json")
		os.Exit(1)
	}

	rawURL := os.Args[1]
	outputFile := ""
	if len(os.Args) > 2 {
		outputFile = os.Args[2]
	}

	config, err := convert(rawURL)
	if err != nil {
		printError("转换失败: " + err.Error())
		os.Exit(1)
	}

	result, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		printError("转换失败: " + err.Error())
		os.Exit(1)
	}

	if outputFile != "" {
		if err := os.WriteFile(outputFile, result, 0o644); err != nil {
			printError("转换失败: " + err.Error())
			os.Exit(1)
		}
		printSuccess("已保存到 " + outputFile)
		return
	}

	fmt.Println(string(result))
	printSuccess("已完成转换，复制上面的 JSON 配置到 sing-box 即可使用")
}

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
