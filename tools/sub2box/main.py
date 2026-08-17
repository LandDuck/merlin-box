#  merlin-box - A sing-box + smartdns routing and proxy script solution for ASUSWRT-Merlin routers.
#  Copyright (C) 2026 LandDuck <https://github.com/LandDuck/>
#  #
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#  #
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#  #
#  You should have received a copy of the GNU General Public License
#  along with this program.  If not, see <https://www.gnu.org/licenses/>.


"""
订阅链接 → sing-box 配置转换工具
支持 Base64 URI 列表 和 Clash YAML
"""

import base64
import ipaddress
import json
import re
import socket
import sys
from urllib.parse import unquote, urlparse, parse_qs
from typing import List, Dict, Any

import requests
import yaml


RESET = "\033[0m"
RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
BLUE = "\033[34m"


def colorize(text: str, color: str) -> str:
    """给输出加上 ANSI 颜色，避免在非 TTY 环境中造成干扰"""
    if sys.stdout is not None and hasattr(sys.stdout, "isatty") and sys.stdout.isatty():
        return f"{color}{text}{RESET}"
    return text


def print_success(message: str) -> None:
    print(colorize(f"[SUCCESS] {message}", GREEN))


def print_warning(message: str) -> None:
    print(colorize(f"[WARNING] {message}", YELLOW))


def print_error(message: str) -> None:
    print(colorize(f"[ERROR] {message}", RED), file=sys.stderr)


def is_local_ip(server: str) -> bool:
    """检测服务器是否为本地/私网地址，跳过不需要的节点"""
    if not server:
        return False

    host = server.strip().strip("[]")
    if not host:
        return False
    if host.lower() in {"localhost", "localhost.localdomain"}:
        return True

    try:
        addr = ipaddress.ip_address(host)
        return (
            addr.is_private
            or addr.is_loopback
            or addr.is_link_local
            or addr.is_multicast
            or addr.is_unspecified
        )
    except ValueError:
        pass

    try:
        infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror:
        return False

    for info in infos:
        ip = info[4][0]
        try:
            addr = ipaddress.ip_address(ip)
            if (
                addr.is_private
                or addr.is_loopback
                or addr.is_link_local
                or addr.is_multicast
                or addr.is_unspecified
            ):
                return True
        except ValueError:
            continue

    return False


def fetch_subscription(url: str, timeout: int = 15) -> str:
    """拉取订阅内容"""
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"
    }
    print_success(f"正在拉取订阅: {url}")
    resp = requests.get(url, headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp.text.strip()


def is_base64(s: str) -> bool:
    """简单判断是否为 Base64"""
    try:
        if len(s) % 4 != 0:
            s += "=" * (4 - len(s) % 4)
        base64.b64decode(s, validate=True)
        return True
    except Exception:
        return False


def decode_base64_sub(content: str) -> List[str]:
    """解码 Base64 订阅，返回 URI 列表"""
    try:
        # 有些订阅会有多余换行或 padding 问题
        content = content.replace("\n", "").replace("\r", "").strip()
        if len(content) % 4 != 0:
            content += "=" * (4 - len(content) % 4)
        decoded = base64.b64decode(content).decode("utf-8", errors="ignore")
        lines = [line.strip() for line in decoded.splitlines() if line.strip()]
        return lines
    except Exception as e:
        raise ValueError(f"Base64 解码失败: {e}")


def parse_ss(uri: str) -> Dict[str, Any] | None:
    """解析 ss://"""
    try:
        # ss://method:password@server:port#name  或  ss://base64@server:port#name
        uri = uri[5:]  # 去掉 ss://
        name = ""
        if "#" in uri:
            uri, name = uri.rsplit("#", 1)
            name = unquote(name)

        if "@" in uri:
            userinfo, server_part = uri.split("@", 1)
            server, port = server_part.rsplit(":", 1)
            port = int(port)

            if is_local_ip(server):
                print_warning(f"跳过本地 IP 节点: {name or f'{server}:{port}'} ({server})")
                return None

            # 尝试判断 userinfo 是否是 base64
            try:
                decoded = base64.urlsafe_b64decode(userinfo + "==").decode()
                if ":" in decoded:
                    method, password = decoded.split(":", 1)
                else:
                    method, password = userinfo.split(":", 1)
            except Exception:
                method, password = userinfo.split(":", 1)
        else:
            print_warning(f"跳过无法解析的 Shadowsocks URI: {uri}")
            return None

        return {
            "type": "shadowsocks",
            "tag": name or f"ss-{server}:{port}",
            "server": server,
            "server_port": port,
            "method": method,
            "password": password
        }
    except Exception:
        print_warning(f"跳过无法解析的 Shadowsocks URI: {uri}")
        return None


def parse_vmess(uri: str) -> Dict[str, Any] | None:
    """解析 vmess://"""
    try:
        b64 = uri[8:]
        if len(b64) % 4 != 0:
            b64 += "=" * (4 - len(b64) % 4)
        data = json.loads(base64.b64decode(b64).decode())

        server = data["add"]
        if is_local_ip(server):
            print_warning(f"跳过本地 IP 节点: {data.get('ps') or server} ({server})")
            return None

        outbound = {
            "type": "vmess",
            "tag": data.get("ps") or f"vmess-{server}",
            "server": server,
            "server_port": int(data["port"]),
            "uuid": data["id"],
            "security": data.get("scy", "auto"),
            "alter_id": int(data.get("aid", 0))
        }

        # TLS
        if data.get("tls") == "tls":
            outbound["tls"] = {
                "enabled": True,
                "server_name": data.get("sni") or data.get("host") or server
            }

        # Transport
        net = data.get("net", "tcp")
        if net == "ws":
            outbound["transport"] = {
                "type": "ws",
                "path": data.get("path", "/"),
                "headers": {"Host": data.get("host", "")} if data.get("host") else {}
            }
        elif net == "grpc":
            outbound["transport"] = {
                "type": "grpc",
                "service_name": data.get("path", "")
            }

        return outbound
    except Exception:
        print_warning(f"跳过无法解析的 VMess URI: {uri}")
        return None


def parse_trojan(uri: str) -> Dict[str, Any] | None:
    """解析 trojan://"""
    try:
        # trojan://password@server:port?sni=xxx#name
        parsed = urlparse(uri)
        password = parsed.username
        server = parsed.hostname
        port = parsed.port or 443
        name = unquote(parsed.fragment) if parsed.fragment else f"trojan-{server}"

        if is_local_ip(server):
            print_warning(f"跳过本地 IP 节点: {name} ({server})")
            return None

        query = parse_qs(parsed.query)
        sni = query.get("sni", [server])[0]

        outbound = {
            "type": "trojan",
            "tag": name,
            "server": server,
            "server_port": port,
            "password": password,
            "tls": {
                "enabled": True,
                "server_name": sni
            }
        }
        return outbound
    except Exception:
        print_warning(f"跳过无法解析的 Trojan URI: {uri}")
        return None


def parse_vless(uri: str) -> Dict[str, Any] | None:
    """解析 vless://（基础支持）"""
    try:
        parsed = urlparse(uri)
        uuid = parsed.username
        server = parsed.hostname
        port = parsed.port or 443
        name = unquote(parsed.fragment) if parsed.fragment else f"vless-{server}"

        if is_local_ip(server):
            print_warning(f"跳过本地 IP 节点: {name} ({server})")
            return None

        query = parse_qs(parsed.query)
        security = query.get("security", ["none"])[0]
        sni = query.get("sni", [server])[0]
        flow = query.get("flow", [""])[0]
        typ = query.get("type", ["tcp"])[0]
        path = query.get("path", ["/"])[0]
        host = query.get("host", [""])[0]

        outbound = {
            "type": "vless",
            "tag": name,
            "server": server,
            "server_port": port,
            "uuid": uuid,
            "flow": flow if flow else ""
        }

        if security in ("tls", "reality"):
            outbound["tls"] = {
                "enabled": True,
                "server_name": sni
            }
            if security == "reality":
                outbound["tag"] = f"{outbound['tag']}（不安全）"
                outbound["tls"]["utls"] = {
                    "enabled": True,
                    "fingerprint": "chrome"
                }
                # Reality 需要更多参数，这里只做基础
                outbound["tls"]["reality"] = {
                    "enabled": True,
                    "public_key": query.get("pbk", [""])[0],
                    "short_id": query.get("sid", [""])[0]
                }
                print_warning(f"检测到 Reality 配置，已为节点启用 uTLS: {outbound['tag']}")

        if typ == "ws":
            outbound["transport"] = {
                "type": "ws",
                "path": path,
                "headers": {"Host": host} if host else {}
            }
        elif typ == "grpc":
            outbound["transport"] = {
                "type": "grpc",
                "service_name": path
            }

        return outbound
    except Exception:
        print_warning(f"跳过无法解析的 Vless URI: {uri}")
        return None


def parse_uri(uri: str) -> Dict[str, Any] | None:
    """统一解析各种协议 URI"""
    uri = uri.strip()
    if not uri:
        return None

    if uri.startswith("ss://"):
        return parse_ss(uri)
    elif uri.startswith("vmess://"):
        return parse_vmess(uri)
    elif uri.startswith("trojan://"):
        return parse_trojan(uri)
    elif uri.startswith("vless://"):
        return parse_vless(uri)

    protocol = uri.split("://", 1)[0].upper() if "://" in uri else uri
    print_warning(f"跳过不支持的协议: {protocol}")
    return None


def parse_clash_yaml(content: str) -> List[Dict[str, Any]]:
    """从 Clash YAML 提取 proxies 并转成 sing-box outbound"""
    data = yaml.safe_load(content)
    proxies = data.get("proxies", [])
    outbounds = []

    for p in proxies:
        t = p.get("type")
        tag = p.get("name", "unnamed")
        server = p.get("server") or p.get("host") or p.get("address")

        if server and is_local_ip(server):
            print_warning(f"跳过本地 IP 节点: {tag} ({server})")
            continue

        if t == "ss":
            outbounds.append({
                "type": "shadowsocks",
                "tag": tag,
                "server": server,
                "server_port": p["port"],
                "method": p.get("cipher", "aes-256-gcm"),
                "password": p["password"]
            })
        elif t == "vmess":
            ob = {
                "type": "vmess",
                "tag": tag,
                "server": server,
                "server_port": p["port"],
                "uuid": p["uuid"],
                "security": p.get("cipher", "auto"),
                "alter_id": p.get("alterId", 0)
            }
            if p.get("tls"):
                ob["tls"] = {"enabled": True, "server_name": p.get("servername") or server}
            if p.get("network") == "ws":
                ob["transport"] = {
                    "type": "ws",
                    "path": p.get("ws-opts", {}).get("path", "/"),
                    "headers": p.get("ws-opts", {}).get("headers", {})
                }
            outbounds.append(ob)
        elif t == "trojan":
            outbounds.append({
                "type": "trojan",
                "tag": tag,
                "server": server,
                "server_port": p["port"],
                "password": p["password"],
                "tls": {
                    "enabled": True,
                    "server_name": p.get("sni") or server
                }
            })
        elif t == "vless":
            ob = {
                "type": "vless",
                "tag": tag,
                "server": server,
                "server_port": p["port"],
                "uuid": p["uuid"],
                "flow": p.get("flow", "")
            }
            if p.get("tls"):
                ob["tls"] = {"enabled": True, "server_name": p.get("servername") or server}
                if p.get("reality"):
                    ob["tag"] = f"{ob['tag']}（不安全）"
                    ob["tls"]["utls"] = {"enabled": True, "fingerprint": "chrome"}
                    ob["tls"]["reality"] = {"enabled": True, "public_key": p.get("reality", {}).get("public_key", ""), "short_id": p.get("reality", {}).get("short_id", "")}
                    print_warning(f"检测到 Reality 配置，已为节点启用 uTLS: {ob['tag']}")
            outbounds.append(ob)
        else:
            print_warning(f"跳过不支持的 Clash 协议: {t}")

    return outbounds


def build_singbox_config(outbounds: List[Dict[str, Any]]) -> Dict[str, Any]:
    """组装完整的 sing-box 配置"""
    # 过滤掉解析失败的
    outbounds = [ob for ob in outbounds if ob]

    if not outbounds:
        raise ValueError("没有成功解析出任何节点")

    tags = [ob["tag"] for ob in outbounds]

    config = {
        "log": {
            "disabled": True,
            "level": "error",
            "output": "logs/singbox-bin.log",
            "timestamp": True
        },
        "dns": {
            "servers": [
                {
                    "type": "hosts",
                    "tag": "hosts-dns",
                    "predefined": {}
                }
            ]
        },
        "inbounds": [
            {
                "type": "socks",
                "tag": "socks-in",
                "listen": "::",
                "listen_port": 65001
            },
            {
                "type": "tproxy",
                "tag": "tproxy-in",
                "listen": "::",
                "listen_port": 65002
            },
            {
                "type": "redirect",
                "tag": "redirect-in",
                "listen": "::",
                "listen_port": 65003
            }
        ],
        "outbounds": outbounds,
        "route": {
            "rules": [],
            "final": tags[0]
        }
    }
    return config


def convert(subscription_url: str) -> Dict[str, Any]:
    """主转换函数"""
    content = fetch_subscription(subscription_url)

    outbounds = []

    # 判断格式
    if content.startswith("proxies:") or "proxies:" in content[:200]:
        print_success("检测到 Clash YAML 格式")
        outbounds = parse_clash_yaml(content)
    elif is_base64(content) or re.match(r'^[A-Za-z0-9+/=]+$', content.replace("\n", "")):
        print_success("检测到 Base64 格式")
        uris = decode_base64_sub(content)
        print_success(f"共解析到 {len(uris)} 条 URI")
        for uri in uris:
            ob = parse_uri(uri)
            if ob:
                outbounds.append(ob)
    else:
        # 尝试直接按行解析 URI
        print_success("尝试按行解析 URI")
        for line in content.splitlines():
            line = line.strip()
            if line:
                ob = parse_uri(line)
                if ob:
                    outbounds.append(ob)

    print_success(f"成功转换 {len(outbounds)} 个节点")
    return build_singbox_config(outbounds)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print_warning("用法: python main.py <订阅链接> [输出文件]")
        print_warning("示例: python main.py https://example.com/sub > config.json")
        sys.exit(1)

    url = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        config = convert(url)
        result = json.dumps(config, ensure_ascii=False, indent=2)

        if output_file:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(result)
            print_success(f"已保存到 {output_file}")
        else:
            print(result)
            print_success(f"已完成转换，复制上面的 JSON 配置到 sing-box 即可使用")
    except Exception as e:
        print_error(f"转换失败: {e}")
        sys.exit(1)
