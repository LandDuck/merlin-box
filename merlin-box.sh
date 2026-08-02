#!/bin/bash

# MIT License
#
# Copyright (c) 2026 LandDuck <https://github.com/LandDuck/>
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO TECHNICAL PRESERVATION, OR FITNESS
# FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

# 当前目录
CUR_DIR=$(cd "$(dirname "$0")"; pwd)
# 脚本名称
SCRIPT_NAME="$(basename "$0")"
# 脚本版本
SCRIPT_VERSION="1.0.0"

# 全局防火墙链名定义
readonly MB_DNS_CHAIN="MERLINKBOX_DNS"
readonly MB_PROXY_CHAIN="MERLINKBOX_PROXY"
readonly MB_ONESELF_CHAIN="MERLINKBOX_ONESELF"
readonly MB_DNS_CHAIN_V6="MERLINKBOX_DNS_V6"
readonly MB_PROXY_CHAIN_V6="MERLINKBOX_PROXY_V6"
readonly MB_ONESELF_CHAIN_V6="MERLINKBOX_ONESELF_V6"

# sing-box 监听的 TPROXY 端口
readonly MB_TPROXY_PORT=65002
# sing-box 监听的 REDIRECT 端口
readonly MB_REDIRECT_PORT=65003
# iptables 打标值与 ip rule 匹配值（一个32位无符号整数, 建议1到255）
readonly MB_FWMARK=168
# 自定义本地路由表编号 (1到32767)
readonly MB_ROUTE_TABLE=111
# 必须在 sing-box 的 outbound 中配置 （一个32位无符号整数, 建议1到255）
readonly MB_SINGBOX_OUT_MARK=169
# IP分流/白名单相关变量
readonly MB_IPSET_NAME="merlinkbox_chn"
readonly MB_IPSET_NAME_V6="merlinkbox_chn_v6"
# 设备黑名单MAC地址SET NAME
readonly MB_MAC_BLACKLIST_NAME="merlinkbox_mac_blacklist"
# 设备白名单MAC地址SET NAME
readonly MB_MAC_WHITELIST_NAME="merlinkbox_mac_whitelist"
readonly MB_CHN_IP4_FILE="${CUR_DIR}/res/chn-ip4.txt"
readonly MB_IP4_WHITELIST_FILE="${CUR_DIR}/res/ip4-whitelist.txt" #这里面的东西不会被代理
readonly MB_CHN_IP6_FILE="${CUR_DIR}/res/chn-ip6.txt"
readonly MB_IP6_WHITELIST_FILE="${CUR_DIR}/res/ip6-whitelist.txt" #这里面的东西不会被代理
readonly MB_MAC_BLACKLIST_FILE="${CUR_DIR}/res/device_blacklist.txt" #这里面的设备不会被代理
readonly MB_MAC_WHITELIST_FILE="${CUR_DIR}/res/device_whitelist.txt" #这里面的设备会被代理
# 是否启用 IPv6 支持 (0 DISABLE, 1 ENABLE)。注意系统会检测到 IPv6 是否可用，如果不可用则会自动禁用 IPv6 支持
MB_ENABLE_IPV6=1
# 屏蔽来自局域网的QUIC协议访问 (0 不屏蔽, 1 屏蔽)
readonly MB_DISABLE_QUIC_FROM_LAN=1
# 是否启用UDP (0 DISABLE, 1 ENABLE)
readonly MB_ENABLE_UDP=0
# 是否启用路由自身代理 (0 DISABLE, 1 ENABLE)。需要 singbox 的 inbound 配置中有 redirect
readonly MB_ENABLE_ONESELF_PROXY=0

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
  tool         工具命令

工具子命令:
  compress_singbox  压缩 sing-box 可执行文件

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

  # 如果已经启用IPV6支持，使用 check_ipv6_support 函数检测当前路由是否支持IPv6，如果不支持则禁用IPv6支持
  if [ "$MB_ENABLE_IPV6" -eq 1 ]; then
    if ! check_ipv6_support; then
      print_warning "当前路由器不支持或已弃用 IPv6，自动禁用 IPv6 支持。"
      MB_ENABLE_IPV6=0
    fi
  fi

  # 如果未能成功加载 TPROXY 模块，停止执行
  if ! check_and_load_tproxy; then
      print_error "脚本终止执行：因不支持 tproxy。"
      exit 1
  fi

	# 清理iptables规则
	reset_iptables
  # 启动singbox socks:65001  tproxy:65002 redirect:65003
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
# 重启服务
#=========================================
restart() {
  stop_singbox
  stop_smartdns
  clear_iptables
  sleep 2
  start
}

#=========================================
# 测试函数
#=========================================
test_debug() {
	#reset_iptables
	#clear_iptables
	#start_singbox
	#start_smartdns
	:
}

#=========================================
# 测试彩色打印函数
#=========================================
test_print() {
  print_normal "This is a normal message."
  print_success "This is an info message."
  print_warning "This is a warning message."
  print_error "This is an error message."
  :
}

#=========================================
# 生成启动脚本 & 将 当前脚本放在 /jffs/scripts/wan-event 中以便每次拨号后自动启动
#=========================================
install() {
  print_line "设置merlin-box开机自启"

  # 目标启动脚本的绝对路径
  local boot_script="${CUR_DIR}/start_merlin_box.sh"
  # wan状态改变时触发的脚本路径
  local merlin_wan_event="/jffs/scripts/wan-event"
  local merlin_wan_event_cifs="/cifs2/scripts/wan-event"
  # u盘挂载完成后触发的脚本路径
  local merlin_wan_start="/jffs/scripts/wan-start"
  local merlin_wan_start_cifs="/cifs2/scripts/wan-start"

  print_normal "修改脚本中的 MD_ROOT_DIR 为当前目录"

  # 修改脚本中的 MD_ROOT_DIR 为当前目录
  sed -i "s|^readonly MD_ROOT_DIR=.*|readonly MD_ROOT_DIR=\"${CUR_DIR}\"|" "${boot_script}"

  print_normal "修改脚本中的 INSTALL_YEAR 为当前年份"

  # 修改脚本中的 INSTALL_YEAR 为当前年份
  sed -i "s|^readonly INSTALL_YEAR=.*|readonly INSTALL_YEAR=$(date +%Y)|" "${boot_script}"

  # 检查并开启梅林固件的 wan-event
  if [ ! -f "${merlin_wan_event}" ]; then
    print_normal "创建 merlin wan-event 脚本"
    echo "#!/bin/sh" > "${merlin_wan_event}"
    chmod +x "${merlin_wan_event}"
  fi
  if [ ! -f "${merlin_wan_event_cifs}" ]; then
    print_normal "创建 merlin wan-event 脚本 on cifs"
    echo "#!/bin/sh" > "${merlin_wan_event_cifs}"
    chmod +x "${merlin_wan_event_cifs}"
  fi
  # 检查并开启梅林固件的 wan-start
  if [ ! -f "${merlin_wan_start}" ]; then
    print_normal "创建 merlin wan-start 脚本"
    echo "#!/bin/sh" > "${merlin_wan_start}"
    chmod +x "${merlin_wan_start}"
  fi
  if [ ! -f "${merlin_wan_start_cifs}" ]; then
    print_normal "创建 merlin wan-start 脚本 on cifs"
    echo "#!/bin/sh" > "${merlin_wan_start_cifs}"
    chmod +x "${merlin_wan_start_cifs}"
  fi

  print_normal "将启动脚本添加到 merlin wan-event 和 wan-start 中"

  # 将脚本放入 wan-event 和 wan-start（先清理旧的历史写入）
  sed -i "\|${boot_script}|d" "${merlin_wan_event}"
  sed -i "\|${boot_script}|d" "${merlin_wan_event_cifs}"
  sed -i "\|${boot_script}|d" "${merlin_wan_start}"
  sed -i "\|${boot_script}|d" "${merlin_wan_start_cifs}"
  # 将 $1 $2 作为参数传递给 boot_script，并在后台异步执行
  echo "${boot_script} wan_event \"\$1\" \"\$2\" >/dev/null 2>&1 &" >> "${merlin_wan_event}"
  echo "${boot_script} wan_event \"\$1\" \"\$2\" >/dev/null 2>&1 &" >> "${merlin_wan_event_cifs}"
  echo "${boot_script} wan_start \"\$1\" >/dev/null 2>&1 &" >> "${merlin_wan_start}"
  echo "${boot_script} wan_start \"\$1\" >/dev/null 2>&1 &" >> "${merlin_wan_start_cifs}"

  print_success "merlin-box启动脚本已设置完成，wan-event 和 wan-start 已配置。"
}

#=========================================
# 卸载启动脚本 & 删除 /jffs/scripts/wan-event 中的对应行
#=========================================
uninstall() {
  print_line "卸载merlin-box开机自启"

  local boot_script="${CUR_DIR}/start_merlin_box.sh"
  local merlin_wan_event="/jffs/scripts/wan-event"
  local merlin_wan_event_cifs="/cifs2/scripts/wan-event"
  local merlin_wan_start="/jffs/scripts/wan-start"
  local merlin_wan_start_cifs="/cifs2/scripts/wan-start"

  # 从 /jffs/scripts/wan-event 中删除启动脚本行
  if [ -f "${merlin_wan_event}" ]; then
    print_normal "从 merlin wan-event 中删除启动脚本行"
    sed -i "\|${boot_script}|d" "${merlin_wan_event}"
  fi
  if [ -f "${merlin_wan_event_cifs}" ]; then
    print_normal "从 merlin wan-event on cifs 中删除启动脚本行"
    sed -i "\|${boot_script}|d" "${merlin_wan_event_cifs}"
  fi
  # 从 /jffs/scripts/wan-start 中删除启动脚本行
  if [ -f "${merlin_wan_start}" ]; then
    print_normal "从 merlin wan-start 中删除启动脚本行"
    sed -i "\|${boot_script}|d" "${merlin_wan_start}"
  fi
  if [ -f "${merlin_wan_start_cifs}" ]; then
    print_normal "从 merlin wan-start on cifs 中删除启动脚本行"
    sed -i "\|${boot_script}|d" "${merlin_wan_start_cifs}"
  fi

  print_line "merlin-box开机自启已卸载完成"
}

#=========================================
#调用 compress_executable_with_upx 压缩sing-box 可执行文件
#=========================================
compress_singbox() {
  local singbox_path="${CUR_DIR}/bin/sing-box"
  compress_executable_with_upx "$singbox_path"
}

#=========================================
#调用 compress_executable_with_upx 压缩smartdns 可执行文件
#=========================================
compress_smartdns() {
  local smartdns_path="${CUR_DIR}/bin/smartdns"
  compress_executable_with_upx "$smartdns_path"
}

#=========================================
# 更新规则文件
#=========================================
update_rules() {
  print_line "更新规则文件"
  # 检测 nvram 是否可用, 如果可用证明在路由器中, 直接下载本项目的规则文件到 res 目录
  if command -v nvram >/dev/null 2>&1; then
    print_normal "检测到在路由器中运行，直接下载规则文件到 res 目录"
    # https://raw.githubusercontent.com/LandDuck/merlin-box/main/res/chn-ip4.txt
    # https://raw.githubusercontent.com/LandDuck/merlin-box/main/res/chn-ip6.txt
    # https://raw.githubusercontent.com/LandDuck/merlin-box/main/res/chn-site.txt

    # wget 这些文件到 res 目录
    wget -O "${CUR_DIR}/res/chn-ip4.txt" "https://raw.githubusercontent.com/LandDuck/merlin-box/main/res/chn-ip4.txt"
    wget -O "${CUR_DIR}/res/chn-ip6.txt" "https://raw.githubusercontent.com/LandDuck/merlin-box/main/res/chn-ip6.txt"
    wget -O "${CUR_DIR}/res/chn-site.txt" "https://raw.githubusercontent.com/LandDuck/merlin-box/main/res/chn-site.txt"

    print_success "规则文件更新完成"

  else
    print_warning "未在路由器中运行，使用 python3 ./tools/update-rules/main.py 更新规则文件"
    if command -v python3 >/dev/null 2>&1; then
      python3 ./tools/update-rules/main.py
    else
      print_error "未检测到 python，请先安装 python"
      exit 1
    fi
  fi
  print_success "规则文件更新完成"
}

#=========================================
# 主函数
#=========================================
main() {
	if [ "$#" -lt 1 ]; then
		print_error "错误: 必须传入参数。"
		show_help
		exit 1
	fi

  # 根据传入的参数执行相应的操作
	case "$1" in
	  install)
  		install
  		;;
  	uninstall)
			uninstall
			;;
		test)
      case "$2" in
        print)
          test_print
          ;;
        debug)
          test_debug
          ;;
        *)
          print_error "错误: 不支持的测试子命令 '$2'"
          print_normal "可用子命令: print, debug"
          exit 1
          ;;
      esac
      ;;
		start)
			start
			;;
		stop)
			stop
			;;
    tool)
      case "$2" in
        compress_singbox)
          compress_singbox
          ;;
        compress_smartdns)
          compress_smartdns
          ;;
        show_devices)
          print_dhcp_devices
          ;;
        update_rules)
          update_rules
          ;;
        -h|--help|"")
          print_normal "用法: $SCRIPT_NAME tool <subcommand>"
          print_normal "可用子命令: compress_singbox, compress_smartdns, show_devices, update_rules"
          ;;
        *)
          print_error "错误: 不支持的工具子命令 '$2'"
          print_normal "可用子命令: compress_singbox, compress_smartdns, show_devices, update_rules"
          exit 1
          ;;
      esac
      ;;
	  restart)
			restart
			;;
		-h|--help)
			show_help
			;;
		-v|--version)
			show_version
			;;
		*)
			print_error "错误: 不支持的参数 '$1'"
			show_help
			exit 1
			;;
	esac
}

main "$@"
