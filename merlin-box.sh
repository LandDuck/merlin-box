#!/bin/bash

# 当前目录
CUR_DIR=$(cd "$(dirname "$0")"; pwd)
# 脚本名称
SCRIPT_NAME="$(basename "$0")"
# 脚本版本
SCRIPT_VERSION="0.0.1"

# 全局防火墙链名定义
readonly MB_DNS_CHAIN="MERLINKBOX_DNS"
readonly MB_PROXY_CHAIN="MERLINKBOX_PROXY"
readonly MB_ONESELF_CHAIN="MERLINKBOX_ONESELF"
readonly MB_DNS_CHAIN_V6="MERLINKBOX_DNS_V6"
readonly MB_PROXY_CHAIN_V6="MERLINKBOX_PROXY_V6"
readonly MB_ONESELF_CHAIN_V6="MERLINKBOX_ONESELF_V6"

# sing-box 监听的 TPROXY 端口
readonly MB_TPROXY_PORT=65002
# iptables 打标值与 ip rule 匹配值（一个32位无符号整数, 建议1到255）
readonly MB_FWMARK=168
# 自定义本地路由表编号 (1到32767)
readonly MB_ROUTE_TABLE=111
# 必须在 sing-box 的 outbound 中配置 （一个32位无符号整数, 建议1到255）
readonly MB_SINGBOX_OUT_MARK=169
# IP分流/白名单相关变量
readonly MB_IPSET_NAME="merlinkbox_chn"
readonly MB_IPSET_NAME_V6="merlinkbox_chn_v6"
readonly MB_CHN_IP4_FILE="${CUR_DIR}/res/chn-ip4.txt"
readonly MB_CHN_IP4_WHITELIST_FILE="${CUR_DIR}/res/chn-ip4-whitelist.txt" #这里面的东西不会被代理
readonly MB_CHN_IP6_FILE="${CUR_DIR}/res/chn-ip6.txt"
readonly MB_CHN_IP6_WHITELIST_FILE="${CUR_DIR}/res/chn-ip6-whitelist.txt" #这里面的东西不会被代理
# 是否启用 IPv6 支持 (0 DISABLE, 1 ENABLE)。注意系统会检测到 IPv6 是否可用，如果不可用则会自动禁用 IPv6 支持
readonly MB_ENABLE_IPV6=1

# 引入fun.sh脚本, ./sh/fun.sh
if [ -f "$CUR_DIR/sh/fun.sh" ]; then
    . "$CUR_DIR/sh/fun.sh"
fi

# ==========================================
# 显示帮助信息
# ==========================================
show_help() {
	cat <<EOF
用法:
  $SCRIPT_NAME <command>

命令:
  start        启动服务
  stop         停止服务

选项:
  -h, --help   显示帮助信息
  -v, --version 显示脚本版本
EOF
}

#=========================================
# 显示版本信息
#=========================================
show_version() {
	echo "$SCRIPT_NAME version $SCRIPT_VERSION"
}

#=========================================
# 启动服务
#=========================================
start() {
	print_line "start merlin-box"
	# 清理iptables规则
	reset_iptables
  # 启动singbox socks:65001  tproxy:65002
  start_singbox
  # 启动smartdns服务
	start_smartdns
  # 重启dnsmasq服务
  restart_dnsmasq
  # 完成
	print_line "merlin-box complete"
}

#=========================================
# 停止服务
#=========================================
stop() {
	print_line "stop merlin-box"
	stop_singbox
	stop_smartdns
	clear_iptables
	restart_dnsmasq
	print_line "merlin-box stopped"
}

#=========================================
# 测试函数
#=========================================
test() {
	#reset_iptables
	#clear_iptables
	#start_singbox
	#start_smartdns
	:
}

#=========================================
# 主函数
#=========================================
main() {
	if [ "$#" -lt 1 ]; then
		echo "错误: 必须传入参数。"
		show_help
		exit 1
	fi

  # 如果已经启用IPV6支持，使用 check_ipv6_support 函数检测当前路由是否支持IPv6，如果不支持则禁用IPv6支持
  if [ "$MB_ENABLE_IPV6" -eq 1 ]; then
    if ! check_ipv6_support; then
      echo "[WARN] 当前路由器不支持或已弃用 IPv6，自动禁用 IPv6 支持。"
      MB_ENABLE_IPV6=0
    fi
  fi

  # 根据传入的参数执行相应的操作
	case "$1" in
		test)
			test
			;;
		start)
			start
			;;
		stop)
			stop
			;;
		-h|--help)
			show_help
			;;
		-v|--version)
			show_version
			;;
		*)
			echo "错误: 不支持的参数 '$1'"
			show_help
			exit 1
			;;
	esac
}

main "$@"
