#!/bin/bash

# MIT License
#
# Copyright (c) 2026 LandDuck
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
readonly MB_IP4_WHITELIST_FILE="${CUR_DIR}/res/ip4-whitelist.txt" #这里面的东西不会被代理
readonly MB_CHN_IP6_FILE="${CUR_DIR}/res/chn-ip6.txt"
readonly MB_IP6_WHITELIST_FILE="${CUR_DIR}/res/ip6-whitelist.txt" #这里面的东西不会被代理
# 是否启用 IPv6 支持 (0 DISABLE, 1 ENABLE)。注意系统会检测到 IPv6 是否可用，如果不可用则会自动禁用 IPv6 支持
MB_ENABLE_IPV6=1
# 屏蔽来自局域网的QUIC协议访问 (0 不屏蔽, 1 屏蔽)
readonly MB_DISABLE_QUIC_FROM_LAN=1
# 是否启用UDP (0 DISABLE, 1 ENABLE)
readonly MB_ENABLE_UDP=0

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
      echo "[WARN] 当前路由器不支持或已弃用 IPv6，自动禁用 IPv6 支持。"
      MB_ENABLE_IPV6=0
    fi
  fi

  # 如果未能成功加载 TPROXY 模块，停止执行
  if ! check_and_load_tproxy; then
      echo "脚本终止执行。"
      exit 1
  fi

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
  print_line "install merlin-box"

  # 目标启动脚本的绝对路径
  local boot_script="${CUR_DIR}/start_merlin_box.sh"
  # wan状态改变时触发的脚本路径
  local merlin_wan_event="/jffs/scripts/wan-event"
  local merlin_wan_event_cifs="/cifs2/scripts/wan-event"
  # u盘挂载完成后触发的脚本路径
  local merlin_mount_event="/jffs/scripts/post-mount"
  local merlin_mount_event_cifs="/cifs2/scripts/post-mount"

  echo "creating boot script"

  # A. 在当前目录下生成启动脚本
  cat << EOF > "${boot_script}"
#!/bin/sh
# Auto-generated by merlin-box installer

# 定义日志文件路径，方便之后查看
LOGFILE="/tmp/merlin-box-boot.log"

# 同时输出到本地日志文件和系统日志 (Syslog)
log_msg() {
    echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1" >> "\$LOGFILE"
    logger -t "merlin-box-boot" "\$1"
}

SCRIPT="\$1"
P1="\${2:-0}"
P2="\${3:-connected}"

log_msg "收到触发事件: SCRIPT=\$SCRIPT, P1=\$P1, P2=\$P2"

# wan 连接事件触发
if [ "\${SCRIPT}" = "wan" ] && [ "\${P1}" = "0" ] && [ "\${P2}" = "connected" ]; then
    log_msg "WAN 事件匹配成功，准备重启 merlin-box..."

    if cd "${CUR_DIR}"; then
        log_msg "已进入目录: ${CUR_DIR}，开始执行 ./merlin-box.sh restart"
        sleep 10
        ./merlin-box.sh restart >> "\$LOGFILE" 2>&1
        EXIT_CODE=\$?
        log_msg "merlin-box 重启命令执行完毕 (退出码: \$EXIT_CODE)"
    else
        log_msg "错误: 无法进入目录 ${CUR_DIR}，启动中断！"
    fi
fi

# U盘被挂载事件触发, 一般情况下视为开机
if [ "\${SCRIPT}" = "mount" ] && [ "\${P1}" = "/tmp/mnt/sda1" ] ; then
    log_msg "U盘挂载事件匹配成功，准备重启 merlin-box..."

    # 要判断当前下有没有mount.sh，如果有，后台执行它。
    # 用于自定义的一些操作
    if [ -f "${CUR_DIR}/mount.sh" ]; then
        log_msg "检测到 mount.sh 脚本，准备后台执行它..."
        nohup sh "${CUR_DIR}/mount.sh" "\${P1}" "\${P2}" >> "\$LOGFILE" 2>&1 &
        log_msg "mount.sh 脚本已在后台执行 (PID: \$!)"
    else
        log_msg "未检测到 mount.sh 脚本，跳过执行。"
    fi

    if cd "${CUR_DIR}"; then
        log_msg "已进入目录: ${CUR_DIR}，开始执行 ./merlin-box.sh restart"
        sleep 10
        ./merlin-box.sh restart >> "\$LOGFILE" 2>&1
        EXIT_CODE=\$?
        log_msg "merlin-box 重启命令执行完毕 (退出码: \$EXIT_CODE)"
    else
        log_msg "错误: 无法进入目录 ${CUR_DIR}，启动中断！"
    fi
fi

EOF

  # 赋予生成的脚本执行权限
  chmod +x "${boot_script}"

  # B. 检查并开启梅林固件的 wan-event
  if [ ! -f "${merlin_wan_event}" ]; then
    echo "Creating merlin wan-event script"
    echo "#!/bin/sh" > "${merlin_wan_event}"
    chmod +x "${merlin_wan_event}"
  fi
  if [ ! -f "${merlin_wan_event_cifs}" ]; then
    echo "Creating merlin wan-event script on cifs"
    echo "#!/bin/sh" > "${merlin_wan_event_cifs}"
    chmod +x "${merlin_wan_event_cifs}"
  fi
  # 检查并开启梅林固件的 post-mount
  if [ ! -f "${merlin_mount_event}" ]; then
    echo "Creating merlin post-mount script"
    echo "#!/bin/sh" > "${merlin_mount_event}"
    chmod +x "${merlin_mount_event}"
  fi
  if [ ! -f "${merlin_mount_event_cifs}" ]; then
    echo "Creating merlin post-mount script on cifs"
    echo "#!/bin/sh" > "${merlin_mount_event_cifs}"
    chmod +x "${merlin_mount_event_cifs}"
  fi

  echo "Adding boot script to merlin wan-event"

  # C. 将脚本放入 wan-event 和 post-mount（先清理旧的历史写入）
  sed -i "\|${boot_script}|d" "${merlin_wan_event}"
  sed -i "\|${boot_script}|d" "${merlin_wan_event_cifs}"
  sed -i "\|${boot_script}|d" "${merlin_mount_event}"
  sed -i "\|${boot_script}|d" "${merlin_mount_event_cifs}"
  # 将 $1 $2 作为参数传递给 boot_script，并在后台异步执行
  echo "${boot_script} wan \"\$1\" \"\$2\" >/dev/null 2>&1 &" >> "${merlin_wan_event}"
  echo "${boot_script} wan \"\$1\" \"\$2\" >/dev/null 2>&1 &" >> "${merlin_wan_event_cifs}"
  echo "${boot_script} mount \"\$1\" >/dev/null 2>&1 &" >> "${merlin_mount_event}"
  echo "${boot_script} mount \"\$1\" >/dev/null 2>&1 &" >> "${merlin_mount_event_cifs}"

  print_line "merlin-box installed"
}

#=========================================
# 卸载启动脚本 & 删除 /jffs/scripts/wan-event 中的对应行
#=========================================
uninstall() {
  print_line "uninstall merlin-box"

  local boot_script="${CUR_DIR}/start_merlin_box.sh"
  local merlin_wan_event="/jffs/scripts/wan-event"
  local merlin_wan_event_cifs="/cifs2/scripts/wan-event"

  # A. 从 /jffs/scripts/wan-event 中删除对应行
  if [ -f "${merlin_wan_event}" ]; then
    echo "Removing boot line from merlin wan-event"
    # 使用 sed 删除包含该脚本路径的行（| 作为定界符，防止路径中的 / 冲突）
    sed -i "\|${boot_script}|d" "${merlin_wan_event}"
  fi
  if [ -f "${merlin_wan_event_cifs}" ]; then
    echo "Removing boot line from merlin wan-event on cifs"
    sed -i "\|${boot_script}|d" "${merlin_wan_event_cifs}"
  fi

  # B. 删除当前目录下生成的启动脚本
  if [ -f "${boot_script}" ]; then
    echo "Removing generated boot script..."
    rm -f "${boot_script}"
  fi

  print_line "merlin-box uninstalled"
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
# 主函数
#=========================================
main() {
	if [ "$#" -lt 1 ]; then
		echo "错误: 必须传入参数。"
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
          echo "错误: 不支持的测试子命令 '$2'"
          echo "可用子命令: print, debug"
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
        -h|--help|"")
          echo "用法: $SCRIPT_NAME tool <subcommand>"
          echo "可用子命令: compress_singbox, compress_smartdns, show_devices"
          ;;
        *)
          echo "错误: 不支持的工具子命令 '$2'"
          echo "可用子命令: compress_singbox, compress_smartdns, show_devices"
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
			echo "错误: 不支持的参数 '$1'"
			show_help
			exit 1
			;;
	esac
}

main "$@"
