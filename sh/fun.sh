
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

# 用于打印彩色日志
readonly GREEN="\033[32m"
readonly YELLOW="\033[33m"
readonly RESET="\033[0m"
readonly RED="\033[31m"

#=========================================
# 打印 错误信息 红色
#=========================================
print_error() {
    printf "${RED}[✗] %s${RESET}\n" "$1"
}

#=========================================
# 打印 成功信息 绿色
#=========================================
print_success() {
    printf "${GREEN}[✓] %s${RESET}\n" "$1"
}

#=========================================
# 打印 警告信息 黄色
#=========================================
print_warning() {
    printf "${YELLOW}[!] %s${RESET}\n" "$1"
}

#=========================================
# 打印 普通信息 默认颜色
#=========================================
print_normal() {
    printf "%s\n" "$1"
}

#=========================================
# 打印 DHCP 租约设备列表
#=========================================
print_dhcp_devices()
{

    #如果未在路由器中执行, 直接return并给出警告
    if ! is_running_on_router; then
        print_warning "⚠️ 当前环境非路由器，无法获取 DHCP 租约设备列表。"
        return 1
    fi

    local lease_file="/var/lib/misc/dnsmasq.leases"

    if [ ! -f "$lease_file" ]; then
        print_error "DHCP lease file not found: $lease_file"
        return 1
    fi

    print_normal "DHCP Devices"
    echo "--------------------------------------------------------------------------------"
    printf "%-20s %-18s %-25s\n" "MAC" "IP" "DEVICE"
    echo "--------------------------------------------------------------------------------"

    awk '
    NF >= 5 && $1 != "duid" {
        printf "%-20s %-18s %-25s\n", $2, $3, $4
    }
    ' "$lease_file"

    echo "--------------------------------------------------------------------------------"
    print_warning "注意: 只显示 DHCP 分配过的设备"
}

# ==========================================
# 检测当前路由是否支持 IPv6
# 如果支持返回0，否则返回1
# 注意linux系统中，函数返回值为0表示成功，非0表示失败
# ==========================================
check_ipv6_support() {
    print_normal "🔍 开始检测当前路由是否支持 IPv6..."

    # 方法 A: 检测本地路由表是否有默认的 IPv6 出口路由 (最准确)
    if ip -6 route show | grep -q "default"; then
        print_success "✅ 检测到默认 IPv6 路由，当前环境支持 IPv6。"
        return 0
    fi

    print_warning "⚠️ 未检测到默认 IPv6 路由，继续尝试 IPv6 连通性检测..."

    # 方法 B: 尝试通过 IPv6 ping 阿里云 DNS 服务器 (2400:3200::1) 来判断是否有 IPv6 网络连接
    # -c 1: 发送1个包, -W 2: 超时时间2秒
    if ping6 -c 1 -W 2 2400:3200::1 >/dev/null 2>&1; then
        print_success "✅ IPv6 连通性检测通过，当前环境支持 IPv6。"
        return 0
    fi

    # 如果以上检测都失败，说明不支持或未启用 IPv6
    print_error "❌ 未检测到可用的 IPv6 路由或连通性，当前环境不支持或未启用 IPv6。"
    return 1
}

# ==========================================
# 检测并加载当前路由内核的 TPROXY 模块
# 如果支持并加载成功返回0，否则返回1
# 注意linux系统中，函数返回值为0表示成功，非0表示失败
# ==========================================
check_and_load_tproxy() {
    print_normal "🔍 开始检测并加载 TPROXY 模块..."

    # 方法 A: 尝试直接加载 xt_TPROXY 模块
    if modprobe xt_TPROXY >/dev/null 2>&1; then
        print_success "✅ xt_TPROXY 模块加载成功（或已处于加载状态），当前环境支持 TPROXY。"
        return 0
    fi

    print_warning "⚠️ modprobe 直接加载失败，开始检查固件文件系统是否存在模块..."

    # 方法 B: 检查文件系统中是否有 TPROXY 相关的 ko 文件
    if find /lib/modules/$(uname -r) -type f -name '*TPROXY*' 2>/dev/null | grep -q .; then
        print_warning "⚠️ 找到 TPROXY 模块文件，但尝试加载时可能遇到内核版本不匹配或其他问题。"
    else
        print_error "❌ 未在系统中找到 TPROXY 模块文件，当前固件内核不支持 TPROXY。"
    fi

    return 1
}

#=========================================
# 打印分隔线
#=========================================
print_line() {
    local text="$1"
    local width=50
    local symbol="="

    # 计算两侧需要的符号数量
    local text_len=${#text}
    local side_len=$(( (width - text_len) / 2 ))

    # 构建左右两侧的符号串
    local sides=$(printf "%0${side_len}d" 0 | tr '0' "$symbol")

    echo "${sides}${text}${sides}"
}

# ==========================================
# 按进程名清理正在运行的进程
# 找到目标进程后优先使用 killall，再补充按 PID 精准清理残留进程
# 用法: kill_process_by_name "chinadns-ng"
# ==========================================
kill_process_by_name() {
    local process_name="$1"
    local process_pid

    if [ -z "$process_name" ]; then
        print_warning "⚠️ 未传入进程名，跳过清理。"
        return 1
    fi

    if ps | grep -v grep | grep -q "$process_name"; then
        print_normal "🔍 侦测到正在运行的 $process_name 进程，正在清理..."
        killall -9 "$process_name" 2>/dev/null

        process_pid=$(ps | grep -v grep | grep "$process_name" | awk '{print $1}')
        if [ ! -z "$process_pid" ]; then
            kill -9 $process_pid 2>/dev/null
        fi

        sleep 2
        print_success "✅ $process_name 进程已清理。"
    else
        print_normal "🔍 未发现运行中的 $process_name 进程，跳过。"
    fi
}

# ==========================================
# 重启 dnsmasq 服务
# ==========================================
restart_dnsmasq(){
    print_line "restarting dnsmasq"

    local OLD_PID=$(pidof dnsmasq)
    if [ -n "${OLD_PID}" ];then
      print_warning "⚠️ 当前dnsmasq正常运行中，pid: ${OLD_PID}，准备重启！"
    else
      print_normal "🔍 当前dnsmasq未运行，尝试重启！"
    fi

    print_normal "⏳ 执行dnsmasq重启服务..."
    service restart_dnsmasq >/dev/null 2>&1

    local DPID
    local i=50
    until [ -n "${DPID}" ]; do
      i=$(($i - 1))
      DPID=$(pidof dnsmasq)
      if [ "$i" -lt 1 ]; then
        print_error "❌ dnsmasq重启失败，请检查你的dnsmasq配置！"
        return 1
      fi
      usleep 250000
    done

    #print_line "dnsmasq complete"
}

# ==========================================
# 启动 sing-box 服务
# ==========================================
start_singbox() {
    # 相关路径
    local SINGBOX_BIN="${CUR_DIR}/bin/sing-box"
    local SINGBOX_CONF="${CUR_DIR}/conf/config.json"
    local SINGBOX_LOG="${CUR_DIR}/logs/sing-box.log"

    print_line "starting singbox"

    # 检查并清理可能残存的旧 sing-box 进程（防止重复启动套娃）
    if ps | grep -v grep | grep -q "$SINGBOX_BIN"; then
        print_normal "🔄 侦测到已存在的 sing-box 实例，正在重启..."
        killall -9 sing-box 2>/dev/null
        sleep 1
    fi

    # 检查核心文件是否存在
    if [ ! -f "$SINGBOX_BIN" ]; then
        print_error "❌ 错误：在当前目录未找到 sing-box 二进制执行文件！"
        exit 1
    fi

    if [ ! -f "$SINGBOX_CONF" ]; then
        print_error "❌ 错误：在当前目录未找到 config.json 配置文件！"
        exit 1
    fi

    # 防御性创建日志文件夹，防止 nonexistent directory 报错
    mkdir -p "${CUR_DIR}/logs"

    # 启动 sing-box 并将日志重定向到当前目录，且在后台长效运行
    print_normal "🚀 正在后台启动 sing-box 纯代理火箭..."
    nohup "$SINGBOX_BIN" run -c "$SINGBOX_CONF" > "$SINGBOX_LOG" 2>&1 &

    sleep 2

    # 验证是否成功驻留后台
    if ps | grep -v grep | grep -q "$SINGBOX_BIN"; then
        print_success "🎉 sing-box 已经在后台稳稳垂钓！"
        print_normal "📝 实时日志已挂载至：$SINGBOX_LOG"

        # setup lan tproxy
        setup_lan_tproxy

        # setup oneself redirect

        if [ "$MB_ENABLE_ONESELF_PROXY" -eq 1 ]; then
            setup_oneself_redirect
        else
            print_warning "🔍 未启用路由器自身代理，跳过自身流量重定向设置。"
        fi

    else
        print_error "❌ 启动失败！请检查 $SINGBOX_LOG 查看具体报错原因。"
    fi

    #print_line "singbox complete"
}

#=========================================
# 停止 sing-box 服务
#=========================================
stop_singbox()
{
    print_line "stopping singbox"

    # 检查是否有正在运行的 sing-box 进程
    if ps | grep -v grep | grep -q "sing-box"; then
        print_warning "⚠️ 侦测到正在运行的 sing-box 实例，正在尝试停止..."
        killall -9 sing-box 2>/dev/null
        sleep 1
        print_success "✅ sing-box 已成功停止。"
    else
        print_normal "🔍 未发现运行中的 sing-box 实例，无需停止。"
    fi

    #print_line "singbox stop complete"
}

#=========================================
# 启动 smartdns 服务
#=========================================
start_smartdns() {
    print_line "starting smartdns"
    # 相关路径
    local SMARTDNS_BIN="${CUR_DIR}/bin/smartdns"
    local SMARTDNS_CONF="${CUR_DIR}/conf/smartdns.conf"
    local SMARTDNS_LOG="${CUR_DIR}/logs/smartdns.log"
    local dnsmasq_postconf="/jffs/scripts/dnsmasq.postconf"
    local dnsmasq_merlin_box_postconf="${CUR_DIR}/scripts/dnsmasq.postconf"

    # 由于要运行在53端口接管dnsmasq的53端口，所以需要先处理下dnsmasq

    # 将 merlin-box 自带的 dnsmasq.postconf 复制到 /jffs/scripts/
    if [ -f "$dnsmasq_merlin_box_postconf" ]; then
        print_normal "🔄 正在部署 $dnsmasq_merlin_box_postconf 到 /jffs/scripts/"
        \cp -f "$dnsmasq_merlin_box_postconf" "/jffs/scripts/dnsmasq.postconf"
        print_success "✅ 部署完成"
    fi

    # 检查并清理可能残存的旧 smartdns 进程（防止端口占用）
    OLD_SMART_PID=$(ps | grep -v grep | grep "$SMARTDNS_BIN" | awk '{print $1}')

    if [ ! -z "$OLD_SMART_PID" ]; then
        print_normal "🔄 侦测到已有 smartdns 实例在运行 (PID: $OLD_SMART_PID)，正在重启..."
        kill -15 $OLD_SMART_PID 2>/dev/null
        sleep 1
        kill -9 $OLD_SMART_PID 2>/dev/null
        sleep 1
        print_success "✅ 旧 smartdns 进程已彻底清理。"
    else
        # 额外兜底：有些固件可能直接运行全局的 smartdns 命令，也尝试清理一下
        if ps | grep -v grep | grep -q "smartdns"; then
            print_warning "⚠️ 发现非当前目录启动的 smartdns 进程，尝试一并清理以防端口冲突..."
            killall -9 smartdns 2>/dev/null
            sleep 1
        else
            print_normal "🔍 未发现运行中的旧 smartdns 进程。尝试停掉dnsmasq。"
            #sleep 2
            service stop_dnsmasq >/dev/null 2>&1
            #local DNSMASQ_PID=$(pidof dnsmasq)
            #if [ ! -z "$DNSMASQ_PID" ]; then
            #    print_normal "🔄 停止 dnsmasq 服务 (PID: $DNSMASQ_PID)..."
            #    kill -15 $DNSMASQ_PID 2>/dev/null
            #    sleep 1
            #    kill -9 $DNSMASQ_PID 2>/dev/null
            #    sleep 1
            #    print_success "✅ dnsmasq 服务已停止。"
            #else
            #    print_normal "🔍 未发现运行中的 dnsmasq 服务，无需停止。"
            #fi
        fi
    fi

    # 检查核心文件是否存在
    if [ ! -f "$SMARTDNS_BIN" ]; then
        print_error "❌ 错误：在当前目录未找到 smartdns 二进制执行文件！"
        exit 1
    fi

    if [ ! -f "$SMARTDNS_CONF" ]; then
        print_error "❌ 错误：在当前目录未找到 smartdns.conf 配置文件！"
        exit 1
    fi

    # 根据是否启用 IPv6 调整 smartdns 配置
    if [ "$MB_ENABLE_IPV6" = "1" ]; then
        sed -i 's/^[[:space:]]*force-AAAA-SOA.*/# force-AAAA-SOA yes/' "$SMARTDNS_CONF"
    else
        sed -i 's/^[[:space:]]*#*[[:space:]]*force-AAAA-SOA.*/force-AAAA-SOA yes/' "$SMARTDNS_CONF"
    fi

    # 防御性创建日志文件夹，防止 nonexistent directory 报错
    mkdir -p "${CUR_DIR}/logs"

    # 启动新的 smartdns 进程

    print_normal "🚀 正在后台启动 smartdns 实例..."

    # 提取纯二进制文件名（去除路径），方便 ps 检索
    SMARTDNS_NAME=$(basename "$SMARTDNS_BIN")

    max_retries=10
    retry_count=0
    success=0

    while [ $retry_count -lt $max_retries ]; do
        retry_count=$((retry_count + 1))

        # 启动进程
        nohup "$SMARTDNS_BIN" -c "$SMARTDNS_CONF" -f > "$SMARTDNS_LOG" 2>&1 &

        sleep 4

        # 检查进程是否存在
        if ps | grep -v grep | grep -q "$SMARTDNS_NAME"; then
            success=1
            break
        fi

        print_error "⚠️ 第 $retry_count 次尝试启动失败，4 秒后重试..."
    done

    # 验证最终运行状态
    if [ $success -eq 1 ]; then
        print_success "🎉 smartdns 已成功在后台挂载运行！（尝试了 $retry_count 次）"
        print_normal "📝 运行日志已重定向至：$SMARTDNS_LOG"

        # 拦截局域网 DNS 53 端口流量送入 smartdns
        setup_dns_hijack
    else
        print_error "❌ 连续尝试 $max_retries 次均启动失败！请检查 $SMARTDNS_LOG 查看具体报错原因。"
    fi

    #print_line "smartdns complete"
}

#=========================================
# 停止 smartdns 服务
#=========================================
stop_smartdns() {
    print_line "stopping smartdns"

    # 检查是否有正在运行的 smartdns 进程
    if ps | grep -v grep | grep -q "smartdns"; then
        print_normal "⚠️ 侦测到正在运行的 smartdns 实例，正在尝试停止..."
        killall -15 smartdns 2>/dev/null
        sleep 1
        killall -9 smartdns 2>/dev/null
        sleep 1
        print_success "✅ smartdns 已成功停止。"
    else
        print_normal "🔍 未发现运行中的 smartdns 实例，无需停止。"
    fi

    # 删除 dnsmasq.postconf 文件
    local dnsmasq_postconf="/jffs/scripts/dnsmasq.postconf"

    if [ -f "$dnsmasq_postconf" ]; then
        print_normal "🔄 检测到 dnsmasq.postconf，正在删除..."
        \rm -f "$dnsmasq_postconf"
        print_success "✅ 删除完成：$dnsmasq_postconf"
    else
        print_normal "🔍 未检测到 dnsmasq.postconf，无需删除。"
    fi

    #print_line "smartdns stop complete"
}

#=========================================
# 局域网 DNS 53 端口劫持
#=========================================
setup_dns_hijack()
{
    print_line "setting up lan dns hijack"

    # 1. 此时自定义链已由 reset_iptables 准备就绪且必为空，直接往里写入重定向规则
    iptables -t nat -A "$MB_DNS_CHAIN" -p udp --dport 53 -j REDIRECT --to-ports 53
    iptables -t nat -A "$MB_DNS_CHAIN" -p tcp --dport 53 -j REDIRECT --to-ports 53

    # 2. 防御性清理：先从 PREROUTING 主链中删掉可能已存在的相同引流规则，防止重复叠加
    iptables -t nat -D PREROUTING -i br0 -p udp --dport 53 -j "$MB_DNS_CHAIN" 2>/dev/null
    iptables -t nat -D PREROUTING -i br0 -p tcp --dport 53 -j "$MB_DNS_CHAIN" 2>/dev/null

    # 3. 在 PREROUTING 主链中正式挂载引流规则：只拦截从 br0 进来的 53 端口流量
    iptables -t nat -A PREROUTING -i br0 -p udp --dport 53 -j "$MB_DNS_CHAIN"
    iptables -t nat -A PREROUTING -i br0 -p tcp --dport 53 -j "$MB_DNS_CHAIN"

    #print_line "lan dns hijack setup complete"

    setup_dns_hijack_ipv6
}

# ==========================================
# 局域网 DNS 53 端口劫持 (IPv6 专属)
# ==========================================
setup_dns_hijack_ipv6()
{
    [ "$MB_ENABLE_IPV6" != "1" ] && return 0
    print_line "setting up lan dns v6 hijack"

    # 🌟 核心避坑：ip6tables 没有 REDIRECT 动作，必须用 DNAT 转发到本地回环地址 [::1]
    ip6tables -t nat -A "$MB_DNS_CHAIN_V6" -p udp --dport 53 -j DNAT --to-destination [::1]:53
    ip6tables -t nat -A "$MB_DNS_CHAIN_V6" -p tcp --dport 53 -j DNAT --to-destination [::1]:53

    # 主链去重与引流挂载
    ip6tables -t nat -D PREROUTING -i br0 -p udp --dport 53 -j "$MB_DNS_CHAIN_V6" 2>/dev/null
    ip6tables -t nat -D PREROUTING -i br0 -p tcp --dport 53 -j "$MB_DNS_CHAIN_V6" 2>/dev/null

    ip6tables -t nat -A PREROUTING -i br0 -p udp --dport 53 -j "$MB_DNS_CHAIN_V6"
    ip6tables -t nat -A PREROUTING -i br0 -p tcp --dport 53 -j "$MB_DNS_CHAIN_V6"

    #print_line "lan dns v6 hijack setup complete"
}

#=========================================
# 局域网常规流量 TPROXY 透明代理封装
#=========================================
setup_lan_tproxy()
{
    print_line "setting up lan tproxy and quic block"

    # 0 匹配 MAC 黑名单集合的流量直接 RETURN（不被代理）
    if [ -f "$MB_MAC_BLACKLIST_FILE" ]; then
      iptables -t mangle -A "$MB_PROXY_CHAIN" -m set --match-set "$MB_MAC_BLACKLIST_NAME" src -j RETURN
    fi
    # 0 匹配 MAC 白名单集合的流量，不在白名单中的设备流量直接 RETURN（不被代理）
    if [ -f "$MB_MAC_WHITELIST_FILE" ]; then
      iptables -t mangle -A "$MB_PROXY_CHAIN" -m set ! --match-set "$MB_MAC_WHITELIST_NAME" src -j RETURN
    fi

    # 1. 局域网互访放行
    iptables -t mangle -A "$MB_PROXY_CHAIN" -d 192.168.0.0/16 -j RETURN
    iptables -t mangle -A "$MB_PROXY_CHAIN" -d 172.16.0.0/12 -j RETURN
    iptables -t mangle -A "$MB_PROXY_CHAIN" -d 10.0.0.0/8 -j RETURN

    # 2. 匹配 IPSET 黑名单集合的流量强制走代理（优先级高于白名单）
    iptables -t mangle -A "$MB_PROXY_CHAIN" -p tcp -m set --match-set "$MB_IPSET_BLACKLIST_NAME" dst -j TPROXY --on-port "$MB_TPROXY_PORT" --tproxy-mark "$MB_FWMARK"
    # UDP 支持
    if [ "$MB_ENABLE_UDP" = "1" ]; then
        iptables -t mangle -A "$MB_PROXY_CHAIN" -p udp -m set --match-set "$MB_IPSET_BLACKLIST_NAME" dst -j TPROXY --on-port "$MB_TPROXY_PORT" --tproxy-mark "$MB_FWMARK"
    fi

    # 2. 匹配 IPSET 白名单集合的 TCP 流量直接 RETURN（直连放行）
    iptables -t mangle -A "$MB_PROXY_CHAIN" -p tcp -m set --match-set "$MB_IPSET_NAME" dst -j RETURN
    # UDP 支持
    if [ "$MB_ENABLE_UDP" = "1" ]; then
        iptables -t mangle -A "$MB_PROXY_CHAIN" -p udp -m set --match-set "$MB_IPSET_NAME" dst -j RETURN
    fi

    # 3. 仅在开关开启时屏蔽局域网的 QUIC (UDP 443)
    if [ "$MB_DISABLE_QUIC_FROM_LAN" = "1" ]; then
        iptables -t mangle -A "$MB_PROXY_CHAIN" -p udp --dport 443 -j DROP
    fi

    # 4. 剩余流量全部送入 TPROXY，使用全局变量端口和打标值
    iptables -t mangle -A "$MB_PROXY_CHAIN" -p tcp -j TPROXY --on-port "$MB_TPROXY_PORT" --tproxy-mark "$MB_FWMARK"
    # UDP 支持
    if [ "$MB_ENABLE_UDP" = "1" ]; then
        iptables -t mangle -A "$MB_PROXY_CHAIN" -p udp -j TPROXY --on-port "$MB_TPROXY_PORT" --tproxy-mark "$MB_FWMARK"
    fi

    # 5. 主链去重清理与排除 DNS 53 - 保持不变
    iptables -t mangle -D PREROUTING -i br0 -p tcp --dport 53 -j RETURN 2>/dev/null
    iptables -t mangle -D PREROUTING -i br0 -p udp --dport 53 -j RETURN 2>/dev/null
    iptables -t mangle -D PREROUTING -i br0 -j "$MB_PROXY_CHAIN" 2>/dev/null
    #--
    iptables -t mangle -A PREROUTING -i br0 -p tcp --dport 53 -j RETURN
    #UDP 支持
    if [ "$MB_ENABLE_UDP" = "1" ]; then
        iptables -t mangle -A PREROUTING -i br0 -p udp --dport 53 -j RETURN
    fi
    iptables -t mangle -A PREROUTING -i br0 -j "$MB_PROXY_CHAIN"

    #print_line "lan tproxy setup complete"

    # 执行 IPv6 代理配置
    setup_lan_tproxy_ipv6
}

# ==========================================
# 局域网常规流量 TPROXY 透明代理封装 (IPv6 专属，仅 TCP)
# ==========================================
setup_lan_tproxy_ipv6()
{
    [ "$MB_ENABLE_IPV6" != "1" ] && return 0
    print_line "setting up lan tproxy v6 and quic block"

    # 0 匹配 MAC 黑名单集合的流量直接 RETURN（不被代理）
    if [ -f "$MB_MAC_BLACKLIST_FILE" ]; then
      ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -m set --match-set "$MB_MAC_BLACKLIST_NAME" src -j RETURN
    fi
    # 0 匹配 MAC 白名单集合的流量，不在白名单中的设备流量直接 RETURN（不被代理）
    if [ -f "$MB_MAC_WHITELIST_FILE" ]; then
      ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -m set ! --match-set "$MB_MAC_WHITELIST_NAME" src -j RETURN
    fi

    # 1. 局域网本地特殊 v6 网段直连放行（必须放行 fe80::/10 链路本地地址和私有本地地址）
    ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -d ::1/128 -j RETURN
    ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -d fe80::/10 -j RETURN
    ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -d fc00::/7 -j RETURN

    # 2. 匹配 IPSET IPv6 黑名单集合的流量强制走代理（优先级高于白名单）
    ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p tcp -m set --match-set "$MB_IPSET_BLACKLIST_NAME_V6" dst -j TPROXY --on-port "$MB_TPROXY_PORT" --tproxy-mark "$MB_FWMARK"
    # UDP 支持
    if [ "$MB_ENABLE_UDP" = "1" ]; then
        ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p udp -m set --match-set "$MB_IPSET_BLACKLIST_NAME_V6" dst -j TPROXY --on-port "$MB_TPROXY_PORT" --tproxy-mark "$MB_FWMARK"
    fi

    # 2. 匹配 IPSET 大陆 IPv6 白名单网段直接直连放行
    ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p tcp -m set --match-set "$MB_IPSET_NAME_V6" dst -j RETURN
    # UDP 支持
    if [ "$MB_ENABLE_UDP" = "1" ]; then
        ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p udp -m set --match-set "$MB_IPSET_NAME_V6" dst -j RETURN
    fi

    # 3. 仅在开关开启时屏蔽局域网的 v6 QUIC (UDP 443)
    if [ "$MB_DISABLE_QUIC_FROM_LAN" = "1" ]; then
        ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p udp --dport 443 -j DROP
    fi

    # 4. 剩余 TCP 流量全部送入 TPROXY 本地端口
    ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p tcp -j TPROXY --on-port "$MB_TPROXY_PORT" --tproxy-mark "$MB_FWMARK"
    # UDP 支持
    if [ "$MB_ENABLE_UDP" = "1" ]; then
        ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p udp -j TPROXY --on-port "$MB_TPROXY_PORT" --tproxy-mark "$MB_FWMARK"
    fi

    # 5. 主链去重清理与排除 TCP DNS 53
    ip6tables -t mangle -D PREROUTING -i br0 -p tcp --dport 53 -j RETURN 2>/dev/null
    ip6tables -t mangle -D PREROUTING -i br0 -p udp --dport 53 -j RETURN 2>/dev/null
    ip6tables -t mangle -D PREROUTING -i br0 -j "$MB_PROXY_CHAIN_V6" 2>/dev/null
    #--
    ip6tables -t mangle -A PREROUTING -i br0 -p tcp --dport 53 -j RETURN
    # UDP 支持
    if [ "$MB_ENABLE_UDP" = "1" ]; then
        ip6tables -t mangle -A PREROUTING -i br0 -p udp --dport 53 -j RETURN
    fi
    ip6tables -t mangle -A PREROUTING -i br0 -j "$MB_PROXY_CHAIN_V6"

    #print_line "lan tproxy v6 setup complete"
}

# ==========================================
# 初始化与重置 IPv4 防火墙及策略路由
# ==========================================
reset_iptables()
{
    print_line "resetting IPv4 iptables and routing rules"

    # ----------------------------------------------------------
    # 1. 重置自定义链
    #    先清空链内容，解除对 ipset 的引用；
    #    再删除并重新创建链，确保链处于干净状态。
    # ----------------------------------------------------------

    # DNS 重定向链（nat）
    iptables -t nat -F "$MB_DNS_CHAIN" 2>/dev/null
    iptables -t nat -X "$MB_DNS_CHAIN" 2>/dev/null
    if ! iptables -t nat -L "$MB_DNS_CHAIN" >/dev/null 2>&1; then
        iptables -t nat -N "$MB_DNS_CHAIN" 2>/dev/null
    fi

    # 局域网代理链（mangle）
    iptables -t mangle -F "$MB_PROXY_CHAIN" 2>/dev/null
    iptables -t mangle -X "$MB_PROXY_CHAIN" 2>/dev/null
    if ! iptables -t mangle -L "$MB_PROXY_CHAIN" >/dev/null 2>&1; then
        iptables -t mangle -N "$MB_PROXY_CHAIN" 2>/dev/null
    fi

    # 路由器自身代理链
    iptables -t nat -F "$MB_ONESELF_CHAIN" 2>/dev/null
    iptables -t nat -X "$MB_ONESELF_CHAIN" 2>/dev/null
    if ! iptables -t nat -L "$MB_ONESELF_CHAIN" >/dev/null 2>&1; then
        iptables -t nat -N "$MB_ONESELF_CHAIN"
    fi

    # ----------------------------------------------------------
    # 2. 重建 IPSET 白名单
    # ----------------------------------------------------------
    print_normal "⏳ 正在加载 IPv4 白名单 IPSET..."

    ipset destroy "$MB_IPSET_NAME" 2>/dev/null
    ipset create "$MB_IPSET_NAME" hash:net

    # 中国 IP 段
    if [ -f "$MB_CHN_IP4_FILE" ]; then
        dos2unix "$MB_CHN_IP4_FILE" 2>/dev/null
        (
            echo "create $MB_IPSET_NAME hash:net -exist"
            awk '
                /^[[:space:]]*$/ { next }          # 空行
                /^[[:space:]]*#/ { next }          # 注释
                {print "add '"$MB_IPSET_NAME"' " $1}
            ' "$MB_CHN_IP4_FILE"
        ) | ipset restore 2>/dev/null
        print_success "✅ 已加载中国 IPv4 白名单。"
    else
        print_warning "⚠️ 未找到中国 IPv4 白名单文件：$MB_CHN_IP4_FILE"
    fi

    # 用户自定义白名单
    if [ -f "$MB_IP4_WHITELIST_FILE" ]; then
        dos2unix "$MB_IP4_WHITELIST_FILE" 2>/dev/null
        (
            echo "create $MB_IPSET_NAME hash:net -exist"
            awk '
                /^[[:space:]]*$/ { next }          # 空行
                /^[[:space:]]*#/ { next }          # 注释
                {print "add '"$MB_IPSET_NAME"' " $1}
            ' "$MB_IP4_WHITELIST_FILE"
        ) | ipset restore 2>/dev/null
        print_success "✅ 已加载自定义 IPv4 白名单。"
    else
        print_warning "⚠️ 未找到自定义 IPv4 白名单文件：$MB_IP4_WHITELIST_FILE"
    fi

    # ----------------------------------------------------------
    # 2.5 重建 IPSET 黑名单
    # ----------------------------------------------------------
    print_normal "⏳ 正在加载 IPv4 黑名单 IPSET..."

    ipset destroy "$MB_IPSET_BLACKLIST_NAME" 2>/dev/null
    ipset create "$MB_IPSET_BLACKLIST_NAME" hash:net

    # 用户自定义黑名单
    if [ -f "$MB_IP4_BLACKLIST_FILE" ]; then
        dos2unix "$MB_IP4_BLACKLIST_FILE" 2>/dev/null
        (
            echo "create $MB_IPSET_BLACKLIST_NAME hash:net -exist"
            awk '
                /^[[:space:]]*$/ { next }          # 空行
                /^[[:space:]]*#/ { next }          # 注释
                {print "add '"$MB_IPSET_BLACKLIST_NAME"' " $1}
            ' "$MB_IP4_BLACKLIST_FILE"
        ) | ipset restore 2>/dev/null
        print_success "✅ 已加载自定义 IPv4 黑名单。"
    else
        print_warning "⚠️ 未找到自定义 IPv4 黑名单文件：$MB_IP4_BLACKLIST_FILE"
    fi

    # ----------------------------------------------------------
    # 3. 设备黑名单（MAC 地址），这些设备不会被代理。
    # ----------------------------------------------------------

    if [ -f "$MB_MAC_BLACKLIST_FILE" ]; then
        print_normal "⏳ 正在加载设备 MAC 黑名单..."
        ipset destroy "$MB_MAC_BLACKLIST_NAME" 2>/dev/null
        ipset create "$MB_MAC_BLACKLIST_NAME" hash:mac 2>/dev/null

        dos2unix "$MB_MAC_BLACKLIST_FILE" 2>/dev/null
        (
            echo "create $MB_MAC_BLACKLIST_NAME hash:mac -exist"
            awk '
                /^[[:space:]]*$/ { next }          # 空行
                /^[[:space:]]*#/ { next }          # 注释
                {print "add '"$MB_MAC_BLACKLIST_NAME"' " $1}
            ' "$MB_MAC_BLACKLIST_FILE"
        ) | ipset restore 2>/dev/null
        print_success "✅ 已加载设备 MAC 黑名单。黑名单中的设备不会被代理。"
    else
        print_warning "⚠️ 未找到设备 MAC 黑名单文件：$MB_MAC_BLACKLIST_FILE"
    fi

    # ----------------------------------------------------------
    # 4. 设备白名单（MAC 地址），只有这些设备会被代理。
    # ----------------------------------------------------------
    if [ -f "$MB_MAC_WHITELIST_FILE" ]; then
        print_normal "⏳ 正在加载设备 MAC 白名单..."
        ipset destroy "$MB_MAC_WHITELIST_NAME" 2>/dev/null
        ipset create "$MB_MAC_WHITELIST_NAME" hash:mac 2>/dev/null

        dos2unix "$MB_MAC_WHITELIST_FILE" 2>/dev/null
        (
            echo "create $MB_MAC_WHITELIST_NAME hash:mac -exist"
            awk '
                /^[[:space:]]*$/ { next }          # 空行
                /^[[:space:]]*#/ { next }          # 注释
                {print "add '"$MB_MAC_WHITELIST_NAME"' " $1}
            ' "$MB_MAC_WHITELIST_FILE"
        ) | ipset restore 2>/dev/null
        print_success "✅ 已加载设备 MAC 白名单。仅白名单设备会被代理。"
    else
        print_warning "⚠️ 未找到设备 MAC 白名单文件：$MB_MAC_WHITELIST_FILE"
    fi

    # ----------------------------------------------------------
    # 5. 重置策略路由
    # ----------------------------------------------------------
    while ip rule del fwmark "$MB_FWMARK" table "$MB_ROUTE_TABLE" 2>/dev/null; do
        :
    done

    ip route flush table "$MB_ROUTE_TABLE" 2>/dev/null

    ip rule add fwmark "$MB_FWMARK" table "$MB_ROUTE_TABLE"
    ip route add local default dev lo table "$MB_ROUTE_TABLE"

    # ----------------------------------------------------------
    # 5. 初始化 IPv6
    # ----------------------------------------------------------
    reset_iptables_ipv6
}

# ==========================================
# 初始化与重置 IPv6 防火墙及策略路由
# ==========================================
reset_iptables_ipv6()
{
    [ "$MB_ENABLE_IPV6" != "1" ] && return 0

    print_line "resetting IPv6 iptables and routing rules"

    # ----------------------------------------------------------
    # 1. 重置自定义链
    #    先清空链内容，解除对 ipset 的引用；
    #    再删除并重新创建链，确保链处于干净状态。
    # ----------------------------------------------------------

    # DNS 重定向链（nat）
    ip6tables -t nat -F "$MB_DNS_CHAIN_V6" 2>/dev/null
    ip6tables -t nat -X "$MB_DNS_CHAIN_V6" 2>/dev/null
    if ! ip6tables -t nat -L "$MB_DNS_CHAIN_V6" >/dev/null 2>&1; then
        ip6tables -t nat -N "$MB_DNS_CHAIN_V6" 2>/dev/null
    fi

    # 局域网代理链（mangle）
    ip6tables -t mangle -F "$MB_PROXY_CHAIN_V6" 2>/dev/null
    ip6tables -t mangle -X "$MB_PROXY_CHAIN_V6" 2>/dev/null
    if ! ip6tables -t mangle -L "$MB_PROXY_CHAIN_V6" >/dev/null 2>&1; then
        ip6tables -t mangle -N "$MB_PROXY_CHAIN_V6" 2>/dev/null
    fi

    # 路由器自身代理链
    ip6tables -t nat -F "$MB_ONESELF_CHAIN_V6" 2>/dev/null
    ip6tables -t nat -X "$MB_ONESELF_CHAIN_V6" 2>/dev/null
    if ! ip6tables -t nat -L "$MB_ONESELF_CHAIN_V6" >/dev/null 2>&1; then
        ip6tables -t nat -N "$MB_ONESELF_CHAIN_V6"
    fi

    # ----------------------------------------------------------
    # 2. 重建 IPv6 IPSET 白名单
    # ----------------------------------------------------------
    print_normal "⏳ 正在加载 IPv6 白名单 IPSET..."

    ipset destroy "$MB_IPSET_NAME_V6" 2>/dev/null
    ipset create "$MB_IPSET_NAME_V6" hash:net family inet6

    # 中国 IPv6 段
    if [ -f "$MB_CHN_IP6_FILE" ]; then
        dos2unix "$MB_CHN_IP6_FILE" 2>/dev/null
        (
            echo "create $MB_IPSET_NAME_V6 hash:net family inet6 -exist"
            awk '
                /^[[:space:]]*$/ { next }          # 空行
                /^[[:space:]]*#/ { next }          # 注释
                {print "add '"$MB_IPSET_NAME_V6"' " $1}
            ' "$MB_CHN_IP6_FILE"
        ) | ipset restore 2>/dev/null
        print_success "✅ 已加载中国 IPv6 白名单。"
    else
        print_warning "⚠️ 未找到中国 IPv6 白名单文件：$MB_CHN_IP6_FILE"
    fi

    # 用户自定义 IPv6 白名单
    if [ -f "$MB_IP6_WHITELIST_FILE" ]; then
        dos2unix "$MB_IP6_WHITELIST_FILE" 2>/dev/null
        (
            echo "create $MB_IPSET_NAME_V6 hash:net family inet6 -exist"
            awk '
                /^[[:space:]]*$/ { next }          # 空行
                /^[[:space:]]*#/ { next }          # 注释
                {print "add '"$MB_IPSET_NAME_V6"' " $1}
            ' "$MB_IP6_WHITELIST_FILE"
        ) | ipset restore 2>/dev/null
        print_success "✅ 已加载自定义 IPv6 白名单。"
    else
        print_warning "⚠️ 未找到自定义 IPv6 白名单文件：$MB_IP6_WHITELIST_FILE"
    fi

    # ----------------------------------------------------------
    # 2.5. 重建 IPv6 IPSET 黑名单
    # ----------------------------------------------------------
    print_normal "⏳ 正在加载 IPv6 黑名单 IPSET..."

    ipset destroy "$MB_IPSET_BLACKLIST_NAME_V6" 2>/dev/null
    ipset create "$MB_IPSET_BLACKLIST_NAME_V6" hash:net family inet6

    # 用户自定义 IPv6 黑名单
    if [ -f "$MB_IP6_BLACKLIST_FILE" ]; then
        dos2unix "$MB_IP6_BLACKLIST_FILE" 2>/dev/null
        (
            echo "create $MB_IPSET_BLACKLIST_NAME_V6 hash:net family inet6 -exist"
            awk '
                /^[[:space:]]*$/ { next }          # 空行
                /^[[:space:]]*#/ { next }          # 注释
                {print "add '"$MB_IPSET_BLACKLIST_NAME_V6"' " $1}
            ' "$MB_IP6_BLACKLIST_FILE"
        ) | ipset restore 2>/dev/null
        print_success "✅ 已加载自定义 IPv6 黑名单。"
    else
        print_warning "⚠️ 未找到自定义 IPv6 黑名单文件：$MB_IP6_BLACKLIST_FILE"
    fi

    # ----------------------------------------------------------
    # 3. 重置 IPv6 策略路由
    # ----------------------------------------------------------
    while ip -6 rule del fwmark "$MB_FWMARK" table "$MB_ROUTE_TABLE" 2>/dev/null; do
        :
    done

    ip -6 route flush table "$MB_ROUTE_TABLE" 2>/dev/null

    ip -6 rule add fwmark "$MB_FWMARK" table "$MB_ROUTE_TABLE"
    ip -6 route add local default dev lo table "$MB_ROUTE_TABLE"
}

# ==========================================
# 清理 IPv4 防火墙规则及策略路由
# ==========================================
clear_iptables()
{
    print_line "clear IPv4 iptables and routing rules"

    # ----------------------------------------------------------
    # 1. 删除主链中的跳转规则（Jump）
    #    防止自定义链仍被引用，导致无法删除。
    # ----------------------------------------------------------

    # DNS 重定向入口（nat）
    while iptables -t nat -D PREROUTING -i br0 -p udp --dport 53 -j "$MB_DNS_CHAIN" 2>/dev/null; do :; done
    while iptables -t nat -D PREROUTING -i br0 -p tcp --dport 53 -j "$MB_DNS_CHAIN" 2>/dev/null; do :; done

    # 局域网代理入口（mangle）
    while iptables -t mangle -D PREROUTING -i br0 -p tcp --dport 53 -j RETURN 2>/dev/null; do :; done
    while iptables -t mangle -D PREROUTING -i br0 -p udp --dport 53 -j RETURN 2>/dev/null; do :; done
    while iptables -t mangle -D PREROUTING -i br0 -j "$MB_PROXY_CHAIN" 2>/dev/null; do :; done

    # 路由器自身代理入口（OUTPUT）
    while iptables -t nat -D OUTPUT -p tcp -j "$MB_ONESELF_CHAIN" 2>/dev/null; do :; done
    #while iptables -t nat -D OUTPUT -p udp -j "$MB_ONESELF_CHAIN" 2>/dev/null; do :; done

    # ----------------------------------------------------------
    # 2. 销毁自定义链
    # ----------------------------------------------------------

    # DNS 重定向链（nat）
    iptables -t nat -F "$MB_DNS_CHAIN" 2>/dev/null
    iptables -t nat -X "$MB_DNS_CHAIN" 2>/dev/null

    # 局域网代理链（mangle）
    iptables -t mangle -F "$MB_PROXY_CHAIN" 2>/dev/null
    iptables -t mangle -X "$MB_PROXY_CHAIN" 2>/dev/null

    # 路由器自身代理链（mangle）
    iptables -t nat -F "$MB_ONESELF_CHAIN" 2>/dev/null
    iptables -t nat -X "$MB_ONESELF_CHAIN" 2>/dev/null

    # ----------------------------------------------------------
    # 3. 清理策略路由
    # ----------------------------------------------------------

    while ip rule del fwmark "$MB_FWMARK" table "$MB_ROUTE_TABLE" 2>/dev/null; do
        :
    done

    ip route flush table "$MB_ROUTE_TABLE" 2>/dev/null

    # ----------------------------------------------------------
    # 4. 销毁 IPSET 白名单，MAC 黑名单, MAC 白名单, IPSET 黑名单
    # ----------------------------------------------------------

    ipset destroy "$MB_IPSET_NAME" 2>/dev/null
    ipset destroy "$MB_MAC_BLACKLIST_NAME" 2>/dev/null
    ipset destroy "$MB_MAC_WHITELIST_NAME" 2>/dev/null
    ipset destroy "$MB_IPSET_BLACKLIST_NAME_V6" 2>/dev/null

    # ----------------------------------------------------------
    # 5. 清理 IPv6
    # ----------------------------------------------------------

    clear_iptables_ipv6
}

# ==========================================
# 清理 IPv6 防火墙规则及策略路由
# ==========================================
clear_iptables_ipv6()
{
    [ "$MB_ENABLE_IPV6" != "1" ] && return 0

    print_line "clear IPv6 iptables and routing rules"

    # ----------------------------------------------------------
    # 1. 删除主链中的跳转规则（Jump）
    #    防止自定义链仍被引用，导致无法删除。
    # ----------------------------------------------------------

    # DNS 重定向入口（nat）
    while ip6tables -t nat -D PREROUTING -i br0 -p udp --dport 53 -j "$MB_DNS_CHAIN_V6" 2>/dev/null; do :; done
    while ip6tables -t nat -D PREROUTING -i br0 -p tcp --dport 53 -j "$MB_DNS_CHAIN_V6" 2>/dev/null; do :; done

    # 局域网代理入口（mangle）
    while ip6tables -t mangle -D PREROUTING -i br0 -p tcp --dport 53 -j RETURN 2>/dev/null; do :; done
    while ip6tables -t mangle -D PREROUTING -i br0 -p udp --dport 53 -j RETURN 2>/dev/null; do :; done
    while ip6tables -t mangle -D PREROUTING -i br0 -j "$MB_PROXY_CHAIN_V6" 2>/dev/null; do :; done

    # 路由器自身代理入口（OUTPUT）
    while ip6tables -t nat -D OUTPUT -p tcp -j "$MB_ONESELF_CHAIN_V6" 2>/dev/null; do :; done
    #while ip6tables -t nat -D OUTPUT -p udp -j "$MB_ONESELF_CHAIN_V6" 2>/dev/null; do :; done

    # ----------------------------------------------------------
    # 2. 销毁自定义链
    # ----------------------------------------------------------

    # DNS 重定向链（nat）
    ip6tables -t nat -F "$MB_DNS_CHAIN_V6" 2>/dev/null
    ip6tables -t nat -X "$MB_DNS_CHAIN_V6" 2>/dev/null

    # 局域网代理链（mangle）
    ip6tables -t mangle -F "$MB_PROXY_CHAIN_V6" 2>/dev/null
    ip6tables -t mangle -X "$MB_PROXY_CHAIN_V6" 2>/dev/null

    # 路由器自身代理链（mangle）
    ip6tables -t nat -F "$MB_ONESELF_CHAIN_V6" 2>/dev/null
    ip6tables -t nat -X "$MB_ONESELF_CHAIN_V6" 2>/dev/null

    # ----------------------------------------------------------
    # 3. 清理 IPv6 策略路由
    # ----------------------------------------------------------

    while ip -6 rule del fwmark "$MB_FWMARK" table "$MB_ROUTE_TABLE" 2>/dev/null; do
        :
    done

    ip -6 route flush table "$MB_ROUTE_TABLE" 2>/dev/null

    # ----------------------------------------------------------
    # 4. 销毁 IPv6 IPSET 白名单, IPV6 IPSET 黑名单
    # ----------------------------------------------------------

    ipset destroy "$MB_IPSET_NAME_V6" 2>/dev/null
    ipset destroy "$MB_IPSET_BLACKLIST_NAME_V6" 2>/dev/null

}

#=========================================
# 路由器本机流量透明代理（IPv4 TCP REDIRECT）
#=========================================
setup_oneself_redirect()
{
    print_line "setting up router oneself tcp redirect proxy"

    # ----------------------------------------------------------
    # 1. 本机流量白名单放行
    # ----------------------------------------------------------

    # 放行本地回环地址
    iptables -t nat -A "$MB_ONESELF_CHAIN" -d 127.0.0.0/8 -j RETURN

    # 放行 sing-box 自身流量，防止代理循环
    iptables -t nat -A "$MB_ONESELF_CHAIN" -m mark --mark "$MB_SINGBOX_OUT_MARK" -j RETURN

    # 放行局域网地址
    iptables -t nat -A "$MB_ONESELF_CHAIN" -d 192.168.0.0/16 -j RETURN
    iptables -t nat -A "$MB_ONESELF_CHAIN" -d 172.16.0.0/12 -j RETURN
    iptables -t nat -A "$MB_ONESELF_CHAIN" -d 10.0.0.0/8 -j RETURN

    # 黑名单 IP 强制走代理（优先级高于大陆白名单）
    iptables -t nat -A "$MB_ONESELF_CHAIN" -p tcp -m set --match-set "$MB_IPSET_BLACKLIST_NAME" dst -j REDIRECT --to-ports "$MB_REDIRECT_PORT"

    # 放行大陆 IP 直连流量
    iptables -t nat -A "$MB_ONESELF_CHAIN" -p tcp -m set --match-set "$MB_IPSET_NAME" dst -j RETURN

    # 放行本机 DNS 查询
    iptables -t nat -A "$MB_ONESELF_CHAIN" -p tcp --dport 53 -j RETURN

    # ----------------------------------------------------------
    # 2. 剩余 TCP 流量 REDIRECT 到 sing-box
    # ----------------------------------------------------------
    iptables -t nat -A "$MB_ONESELF_CHAIN" -p tcp -j REDIRECT --to-ports "$MB_REDIRECT_PORT"

    # ----------------------------------------------------------
    # 3. OUTPUT 主链挂载
    # ----------------------------------------------------------
    while iptables -t nat -D OUTPUT -p tcp -j "$MB_ONESELF_CHAIN" 2>/dev/null; do :; done

    iptables -t nat -A OUTPUT -p tcp -j "$MB_ONESELF_CHAIN"

    # 初始化 IPv6
    setup_oneself_redirect_ipv6
}

#=========================================
# 路由器本机流量透明代理（IPv6 TCP REDIRECT）
#=========================================
setup_oneself_redirect_ipv6()
{
    [ "$MB_ENABLE_IPV6" != "1" ] && return 0

    print_line "setting up router oneself tcp redirect proxy v6"

    # ----------------------------------------------------------
    # 1. IPv6 本机流量白名单放行
    # ----------------------------------------------------------

    # 放行 IPv6 回环地址
    ip6tables -t nat -A "$MB_ONESELF_CHAIN_V6" -d ::1/128 -j RETURN

    # 放行 sing-box 自身流量，防止代理循环
    ip6tables -t nat -A "$MB_ONESELF_CHAIN_V6" -m mark --mark "$MB_SINGBOX_OUT_MARK" -j RETURN

    # 放行链路本地地址
    ip6tables -t nat -A "$MB_ONESELF_CHAIN_V6" -d fe80::/10 -j RETURN

    # 放行 IPv6 私有地址
    ip6tables -t nat -A "$MB_ONESELF_CHAIN_V6" -d fc00::/7 -j RETURN

    # 黑名单 IPv6 IP 强制走代理（优先级高于大陆白名单）
    ip6tables -t nat -A "$MB_ONESELF_CHAIN_V6" -p tcp -m set --match-set "$MB_IPSET_BLACKLIST_NAME_V6" dst -j REDIRECT --to-ports "$MB_REDIRECT_PORT"

    # 放行大陆 IPv6 IP 直连流量
    ip6tables -t nat -A "$MB_ONESELF_CHAIN_V6" -p tcp -m set --match-set "$MB_IPSET_NAME_V6" dst -j RETURN

    # 放行本机 DNS 查询
    ip6tables -t nat -A "$MB_ONESELF_CHAIN_V6" -p tcp --dport 53 -j RETURN

    # ----------------------------------------------------------
    # 2. 剩余 TCP 流量 REDIRECT 到 sing-box
    # ----------------------------------------------------------
    ip6tables -t nat -A "$MB_ONESELF_CHAIN_V6" -p tcp -j REDIRECT --to-ports "$MB_REDIRECT_PORT"

    # ----------------------------------------------------------
    # 3. OUTPUT 主链挂载
    # ----------------------------------------------------------
    while ip6tables -t nat -D OUTPUT -p tcp -j "$MB_ONESELF_CHAIN_V6" 2>/dev/null; do :; done

    ip6tables -t nat -A OUTPUT -p tcp -j "$MB_ONESELF_CHAIN_V6"
}

# =========================================
# 检测是否在路由器中运行
# 如果在路由器中运行，返回 0；否则返回 1
# =========================================
is_running_on_router() {
    if type nvram >/dev/null 2>&1; then
        return 0  # 是路由器环境
    else
        return 1  # 不是路由器环境
    fi
}

# ========================================
# set tcp_fastopen
# ========================================
set_tcp_fast_open() {
    local value="${1:-1}"

    case "$value" in
        0|1|2|3)
            ;;
        *)
            print_warning "⚠️ 无效的 TCP Fast Open 值：$value。请使用 0、1、2 或 3。"
            return 1
            ;;
    esac

    # 0 表示仅关闭 sing-box 的 TFO；
    # 路由器内核仍保持客户端 TFO，因此强制使用 1
    if [ "$value" -eq 0 ]; then
        value=1
    fi

    if [ -f /proc/sys/net/ipv4/tcp_fastopen ]; then
        echo "$value" > /proc/sys/net/ipv4/tcp_fastopen
        print_success "✅ TCP Fast Open 已设置为：$value"
    else
        print_warning "⚠️ 当前系统不支持 TCP Fast Open。"
        return 1
    fi
}

# =========================================
# 重置 tcp_fastopen
# 重置为 1
# =========================================
reset_tcp_fast_open() {
    if [ -f /proc/sys/net/ipv4/tcp_fastopen ]; then
        echo 1 > /proc/sys/net/ipv4/tcp_fastopen
        print_success "✅ 已重置 TCP Fast Open。"
    else
        print_warning "⚠️ 当前系统不支持 TCP Fast Open。"
    fi
}

########################################
# 从 JSON 文件中获取指定键的值，如果不存在则返回默认值
########################################
get_json_value() {
    key="$1"
    default="$2"
    file="$3"

    value=$(grep "\"$key\"" "$file" | head -n 1 | sed 's/.*:[[:space:]]*//' | sed 's/[[:space:],]*$//')

    [ -n "$value" ] && echo "$value" || echo "$default"
}
