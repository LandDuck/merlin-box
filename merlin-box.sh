#!/bin/bash

#
#  merlin-box - A sing-box + smartdns routing and proxy script solution for ASUSWRT-Merlin routers.
#  Copyright (C) 2026 LandDuck <https://github.com/LandDuck/>
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program.  If not, see <https://www.gnu.org/licenses/>.
#

# 当前目录
CUR_DIR=$(cd "$(dirname "$0")"; pwd)
# 脚本名称
SCRIPT_NAME="$(basename "$0")"
# 脚本版本
SCRIPT_VERSION="1.0.3"
# PID
PID_FILE="/tmp/merlin-box.pid"

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
# IP分流/白名单相关变量(直连)
readonly MB_IPSET_NAME="merlinkbox_chn"
readonly MB_IPSET_NAME_V6="merlinkbox_chn_v6"
# IP分流/黑名单相关变量(强制代理)
readonly MB_IPSET_BLACKLIST_NAME="merlinkbox_blacklist"
readonly MB_IPSET_BLACKLIST_NAME_V6="merlinkbox_blacklist_v6"
# 设备黑名单MAC地址SET NAME
readonly MB_MAC_BLACKLIST_NAME="merlinkbox_mac_blacklist"
# 设备白名单MAC地址SET NAME
readonly MB_MAC_WHITELIST_NAME="merlinkbox_mac_whitelist"
readonly MB_CHN_IP4_FILE="${CUR_DIR}/res/chn-ip4.txt"
readonly MB_IP4_WHITELIST_FILE="${CUR_DIR}/res/ip4-whitelist.txt" #这里面的东西不会被代理
readonly MB_IP4_BLACKLIST_FILE="${CUR_DIR}/res/ip4-blacklist.txt" #这里面的东西会被强制代理
readonly MB_CHN_IP6_FILE="${CUR_DIR}/res/chn-ip6.txt"
readonly MB_IP6_WHITELIST_FILE="${CUR_DIR}/res/ip6-whitelist.txt" #这里面的东西不会被代理
readonly MB_IP6_BLACKLIST_FILE="${CUR_DIR}/res/ip6-blacklist.txt" #这里面的东西会被强制代理
readonly MB_MAC_BLACKLIST_FILE="${CUR_DIR}/res/device_blacklist.txt" #这里面的设备不会被代理
readonly MB_MAC_WHITELIST_FILE="${CUR_DIR}/res/device_whitelist.txt" #这里面的设备会被代理
# 是否启用 IPv6 支持 (0 DISABLE, 1 ENABLE)。注意系统会检测到 IPv6 是否可用，如果不可用则会自动禁用 IPv6 支持
MB_ENABLE_IPV6=1
# 屏蔽来自局域网的QUIC协议访问 (0 不屏蔽, 1 屏蔽)
MB_DISABLE_QUIC_FROM_LAN=1
# 是否启用UDP (0 DISABLE, 1 ENABLE)
MB_ENABLE_UDP=0
# 是否启用路由自身代理 (0 DISABLE, 1 ENABLE)。需要 singbox 的 inbound 配置中有 redirect
MB_ENABLE_ONESELF_PROXY=0

# 引入fun.sh脚本, ./sh/fun.sh
if [ -f "$CUR_DIR/sh/fun.sh" ]; then
    . "$CUR_DIR/sh/fun.sh"
fi

# 引入 tool.sh 脚本, ./sh/tool.sh
if [ -f "$CUR_DIR/sh/tool.sh" ]; then
    . "$CUR_DIR/sh/tool.sh"
fi

# ==========================================
# 显示帮助信息
# ==========================================
show_help() {
	cat <<EOF
用法:
  $SCRIPT_NAME <command> [args]

命令:
  start        启动服务，可选参数: [enable_ipv6] [disable_quic_from_lan] [enable_udp] [enable_oneself_proxy]
  stop         停止服务
  restart      重启服务，可选参数: [enable_ipv6] [disable_quic_from_lan] [enable_udp] [enable_oneself_proxy]
  install      设置 merlin-box 开机自启
  uninstall    卸载 merlin-box 开机自启
  tool         工具命令
  test         测试命令

tool 子命令:
  compress_singbox   压缩 sing-box 可执行文件
  compress_smartdns  压缩 smartdns 可执行文件
  show_devices       显示局域网 DHCP 设备列表
  update_rules       更新规则文件 (chn-ip4/ip6/site)
  build_singbox      编译构建 sing-box 可执行文件
  download_smartdns  下载 smartdns 可执行文件
  sub2box            将订阅链接转换为 sing-box 配置文件
  build_ui           构建 web-ui

test 子命令:
  print        测试彩色打印输出
  debug        测试调试函数

start 参数说明 (默认值: 1 1 0 0):
  enable_ipv6            是否启用 IPv6 (0/1)
  disable_quic_from_lan  是否屏蔽 LAN 侧 QUIC (0/1)
  enable_udp             是否启用 UDP 代理 (0/1)
  enable_oneself_proxy   是否启用路由自身代理 (0/1)

选项:
  -h, --help    显示帮助信息
  -v, --version 显示脚本版本
EOF
}

#=========================================
# 显示版本信息
#=========================================
show_version() {
  print_success "$SCRIPT_NAME version $SCRIPT_VERSION Copyright (C) 2026 LandDuck <https://github.com/LandDuck/>"
  print_warning "License GPLv3+: GNU GPL version 3 or later <https://gnu.org/licenses/gpl.html>."
  print_warning "This is free software: you are free to change and redistribute it."
  print_warning "There is NO WARRANTY, to the extent permitted by law."
}

#=========================================
# 启动服务
#=========================================
start() {
  local start_enable_ipv6="${1:-$MB_ENABLE_IPV6}"
  local start_disable_quic_from_lan="${2:-$MB_DISABLE_QUIC_FROM_LAN}"
  local start_enable_udp="${3:-$MB_ENABLE_UDP}"
  local start_enable_oneself_proxy="${4:-$MB_ENABLE_ONESELF_PROXY}"

  case "$start_enable_ipv6" in
    0|1) ;;
    *)
      print_error "错误: start 参数 enable_ipv6 只能是 0 或 1，当前值: '$start_enable_ipv6'"
      exit 1
      ;;
  esac
  case "$start_disable_quic_from_lan" in
    0|1) ;;
    *)
      print_error "错误: start 参数 disable_quic_from_lan 只能是 0 或 1，当前值: '$start_disable_quic_from_lan'"
      exit 1
      ;;
  esac
  case "$start_enable_udp" in
    0|1) ;;
    *)
      print_error "错误: start 参数 enable_udp 只能是 0 或 1，当前值: '$start_enable_udp'"
      exit 1
      ;;
  esac
  case "$start_enable_oneself_proxy" in
    0|1) ;;
    *)
      print_error "错误: start 参数 enable_oneself_proxy 只能是 0 或 1，当前值: '$start_enable_oneself_proxy'"
      exit 1
      ;;
  esac

  MB_ENABLE_IPV6="$start_enable_ipv6"
  MB_DISABLE_QUIC_FROM_LAN="$start_disable_quic_from_lan"
  MB_ENABLE_UDP="$start_enable_udp"
  MB_ENABLE_ONESELF_PROXY="$start_enable_oneself_proxy"

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

  # 如果存在 merlin-box 的 PID 文件，说明 merlin-box 已经在运行，先停止它
  if [ -f "$PID_FILE" ]; then
    print_warning "检测到 merlin-box 已经在运行，先停止它"
    stop
    sleep 2
  fi

	# 清理iptables规则
	reset_iptables
  # 启动singbox socks:65001  tproxy:65002 redirect:65003
  start_singbox
  # 启动smartdns服务
	start_smartdns
  # 重启dnsmasq服务
  restart_dnsmasq

  # 保存 sing-box 的 PID
  pidof sing-box > "$PID_FILE"

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

	# 删除 PID 文件
	if [ -f "$PID_FILE" ]; then
    rm -f "$PID_FILE"
  fi

	print_line "merlin-box stopped"
}

#=========================================
# 重启服务
#=========================================
restart() {
  stop_singbox
  stop_smartdns
  clear_iptables
  # 删除 PID 文件
  if [ -f "$PID_FILE" ]; then
    rm -f "$PID_FILE"
  fi
  sleep 2
  start "$1" "$2" "$3" "$4"
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
      if [ "$#" -gt 5 ]; then
        print_error "错误: start 最多支持 4 个可选参数，当前传入: $(($# - 1))"
        print_normal "用法: $SCRIPT_NAME start [enable_ipv6] [disable_quic_from_lan] [enable_udp] [enable_oneself_proxy]"
        exit 1
      fi
			start "$2" "$3" "$4" "$5"
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
        build_singbox)
          # 判断是否传入了 $3(平台)
          if [ -z "$3" ]; then
            #手动执行
            build_singbox
          else
            #由github action 自动执行
            VERSION=$(get_github_latest_release "sagernet/sing-box")
            print_warning "远程仓库最新版本: $VERSION"
            build_singbox "$VERSION" "$3"
          fi
          ;;
        download_smartdns)
          #VERSION=$(get_github_latest_release "pymumu/smartdns")
          #VERSION=$(get_github_latest_release "sagernet/sing-box")
          #print_warning "远程仓库最新版本: $VERSION"
          #download_smartdns "$VERSION" "arm64" #版本纯数字 架构arm64/arm
          # 判断是否传入了 $3(平台)
          if [ -z "$3" ]; then
            #手动执行
            download_smartdns
          else
            #由github action 自动执行
            VERSION=$(get_github_latest_release "pymumu/smartdns")
            print_warning "远程仓库最新版本: $VERSION"
            download_smartdns "$VERSION" "$3"
          fi
          ;;
        sub2box)
          subscription_to_singbox_config "$3"
          ;;
        build_ui)
          build_ui
          ;;
        -h|--help|"")
          print_normal "用法: $SCRIPT_NAME tool <subcommand>"
          print_normal "可用子命令: compress_singbox, compress_smartdns, show_devices, update_rules, build_singbox, download_smartdns, sub2box, build_ui"
          ;;
        *)
          print_error "错误: 不支持的工具子命令 '$2'"
          print_normal "可用子命令: compress_singbox, compress_smartdns, show_devices, update_rules, build_singbox, download_smartdns, sub2box, build_ui"
          exit 1
          ;;
      esac
      ;;
	  restart)
	    if [ "$#" -gt 5 ]; then
        print_error "错误: restart 最多支持 4 个可选参数，当前传入: $(($# - 1))"
        print_normal "用法: $SCRIPT_NAME restart [enable_ipv6] [disable_quic_from_lan] [enable_udp] [enable_oneself_proxy]"
        exit 1
      fi
			restart "$2" "$3" "$4" "$5"
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
