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
  $SCRIPT_NAME <command> [subcommand]

命令:
  start        启动服务
  stop         停止服务
  restart      重启服务
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

test 子命令:
  print        测试彩色打印输出
  debug        测试调试函数

选项:
  -h, --help    显示帮助信息
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
# 构建 sing-box 可执行文件
#=========================================
build_singbox() {

  print_line "构建 sing-box 可执行文件"

  # 询问用户要构建的 sing-box 版本
  read -p "请输入要构建的 sing-box 版本 (例如 v1.13.16 或 1.13.16): " raw_version
  # 询问架构 arm64 或 arm
  read -p "请输入要构建的架构 (arm64 或 arm): " arch
  if [ "$arch" != "arm64" ] && [ "$arch" != "arm" ]; then
    print_error "错误: 不支持的架构 '$arch'，请使用 arm64 或 arm"
    exit 1
  fi

  # 规范化版本号：确保 singbox_version 不带 v，tag_name 带有 v
  VERSION_NO_V="${raw_version#v}"
  TAG_NAME="v${VERSION_NO_V}"

  # 检查工具集
  for cmd in git go tar; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      print_error "未检测到 $cmd，请先安装 $cmd"
      exit 1
    fi
  done

  # 开发阶段调试用的
  ### WORK_DIR=$CUR_DIR/tmp
  # 如果不存在， 创建工作目录
  ### mkdir -p "$WORK_DIR"
  # 开发阶段调试用的结束

  # 创建独立的工作临时目录，并在脚本退出/中断时自动清理
  WORK_DIR=$(mktemp -d -t singbox-build-XXXXXX)
  trap 'rm -rf "$WORK_DIR"' EXIT

  echo "工作目录: $WORK_DIR"
  cd "$WORK_DIR" || exit 1

  # 1. 下载 sing-box 源码
  print_line "正在克隆 sing-box (${TAG_NAME})..."
  if ! git clone --branch "$TAG_NAME" --depth 1 "https://github.com/SagerNet/sing-box.git" sing-box; then
   print_error "找不到标签为 ${TAG_NAME} 的 sing-box 源码，请检查版本号！"
   exit 1
  fi

  # 2. 读取 sing-box 要求的精确 cronet-go 版本号
  CD_SINGBOX="$WORK_DIR/sing-box"
  CRONET_GO_VERSION=$(cat "$CD_SINGBOX/.github/CRONET_GO_VERSION")

  if [ -z "$CRONET_GO_VERSION" ]; then
    print_error "未能在 .github/CRONET_GO_VERSION 中找到 cronet-go 版本配置"
    exit 1
  fi

  # 3. 按指定的 Commit/Tag 克隆 cronet-go 并拉取子模块
  print_line "正在克隆匹配的 cronet-go (${CRONET_GO_VERSION})..."
  mkdir -p cronet-go
  cd cronet-go || exit 1
  git init
  git remote add origin https://github.com/sagernet/cronet-go.git
  git fetch --depth=1 origin "$CRONET_GO_VERSION"
  git checkout FETCH_HEAD
  git submodule update --init --recursive --depth=1

  # 4. 初始化 keyring 并准备工具链环境
  print_line "准备 Chromium/musl 工具链..."
  rm -f ./naiveproxy/src/build/linux/sysroot_scripts/keyring.gpg
  GPG_TTY=/dev/null ./naiveproxy/src/build/linux/sysroot_scripts/generate_keyring.sh || true
  go run ./cmd/build-naive --target=linux/"${arch}" --libc=musl download-toolchain

  # 执行 build-naive env 并捕获原始输出
  ENV_OUTPUT=$(go run ./cmd/build-naive --target=linux/"${arch}" --libc=musl env)
  # echo "环境变量输出:"
  # echo "$ENV_OUTPUT"

  # 1. 提取 raw 变量
  RAW_CC=$(echo "$ENV_OUTPUT" | grep '^CC=' | cut -d'=' -f2-)
  RAW_CXX=$(echo "$ENV_OUTPUT" | grep '^CXX=' | cut -d'=' -f2-)
  RAW_LDFLAGS=$(echo "$ENV_OUTPUT" | grep '^CGO_LDFLAGS=' | cut -d'=' -f2-)
  RAW_QEMU=$(echo "$ENV_OUTPUT" | grep '^QEMU_LD_PREFIX=' | cut -d'=' -f2-)

  # 2. 剥离纯路径与标志（关键：在 grep 参数后加上 -- ）
  PURE_CC=$(echo "$RAW_CC" | awk '{print $1}')
  PURE_CXX=$(echo "$RAW_CXX" | awk '{print $1}')

  # 加上 -- 阻止 grep 解析开头的杠杠
  TARGET_FLAG=$(echo "$RAW_CC" | grep -o -E -- '--target=[^ ]*')
  SYSROOT_FLAG=$(echo "$RAW_CC" | grep -o -E -- '--sysroot=[^ ]*')

  # 3. 导出标准 CGO 环境变量
  export CC="${PURE_CC}"
  export CXX="${PURE_CXX}"
  export CGO_CFLAGS="${TARGET_FLAG} ${SYSROOT_FLAG}"
  export CGO_CXXFLAGS="${TARGET_FLAG} ${SYSROOT_FLAG}"
  export CGO_LDFLAGS="${RAW_LDFLAGS} ${TARGET_FLAG} ${SYSROOT_FLAG}"
  export QEMU_LD_PREFIX="${RAW_QEMU}"

  export CGO_ENABLED=1
  export GOOS=linux
  export GOARCH="${arch}"
  #如果是arm架构, 需要设置 GOARM=7
  if [ "$arch" = "arm" ]; then
    export GOARM=7
  fi

  # 5. 读取默认 Build Tags (如有) 或使用推荐 Tags
  cd "$CD_SINGBOX" || exit 1

  # merlin-box 使用这些就够了
  BUILD_TAGS="with_musl,with_quic,with_utls,with_naive_outbound"

  # 6. 开始编译 sing-box
  print_line "开始编译 sing-box..."
  mkdir -p "${CUR_DIR}/bin"

  go build -v -trimpath \
    -tags "${BUILD_TAGS}" \
    -ldflags "-X github.com/sagernet/sing-box/constant.Version=${VERSION_NO_V} -s -w -buildid=" \
    -o "${CUR_DIR}/bin/sing-box" \
    ./cmd/sing-box

  # 调用压缩函数
  compress_singbox

  print_success "sing-box 可执行文件构建完成: ${CUR_DIR}/bin/sing-box"
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
        build_singbox)
          build_singbox
          ;;
        -h|--help|"")
          print_normal "用法: $SCRIPT_NAME tool <subcommand>"
          print_normal "可用子命令: compress_singbox, compress_smartdns, show_devices, update_rules, build_singbox"
          ;;
        *)
          print_error "错误: 不支持的工具子命令 '$2'"
          print_normal "可用子命令: compress_singbox, compress_smartdns, show_devices, update_rules, build_singbox"
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
