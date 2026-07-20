# ==========================================
# 检测当前路由是否支持 IPv6
# 如果支持返回0，否则返回1
# 注意linux系统中，函数返回值为0表示成功，非0表示失败
# ==========================================
check_ipv6_support() {
    echo "🔍 开始检测当前路由是否支持 IPv6..."

    # 方法 A: 检测本地路由表是否有默认的 IPv6 出口路由 (最准确)
    if ip -6 route show | grep -q "default"; then
        echo "✅ 检测到默认 IPv6 路由，当前环境支持 IPv6。"
        return 0
    fi

    echo "⚠️ 未检测到默认 IPv6 路由，继续尝试 IPv6 连通性检测..."

    # 方法 B: 尝试通过 IPv6 ping 阿里云 DNS 服务器 (2400:3200::1) 来判断是否有 IPv6 网络连接
    # -c 1: 发送1个包, -W 2: 超时时间2秒
    if ping6 -c 1 -W 2 2400:3200::1 >/dev/null 2>&1; then
        echo "✅ IPv6 连通性检测通过，当前环境支持 IPv6。"
        return 0
    fi

    # 如果以上检测都失败，说明不支持或未启用 IPv6
    echo "❌ 未检测到可用的 IPv6 路由或连通性，当前环境不支持或未启用 IPv6。"
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
        echo "⚠️ 未传入进程名，跳过清理。"
        return 1
    fi

    if ps | grep -v grep | grep -q "$process_name"; then
        echo "⚠️ 侦测到正在运行的 $process_name 进程，正在清理..."
        killall -9 "$process_name" 2>/dev/null

        process_pid=$(ps | grep -v grep | grep "$process_name" | awk '{print $1}')
        if [ ! -z "$process_pid" ]; then
            kill -9 $process_pid 2>/dev/null
        fi

        sleep 2
        echo "✅ $process_name 进程已清理。"
    else
        echo "🔍 未发现运行中的 $process_name 进程，跳过。"
    fi
}

# ==========================================
# 重启 dnsmasq 服务
# ==========================================
restart_dnsmasq(){
    print_line "dnsmasq"

	local OLD_PID=$(pidof dnsmasq)
	if [ -n "${OLD_PID}" ];then
		echo "⚠️ 当前dnsmasq正常运行中，pid: ${OLD_PID}，准备重启！"
	else
		echo "🔍 当前dnsmasq未运行，尝试重启！"
	fi

	echo "⏳ 执行dnsmasq重启服务..."
	service restart_dnsmasq >/dev/null 2>&1

	local DPID
	local i=50
	until [ -n "${DPID}" ]; do
		i=$(($i - 1))
		DPID=$(pidof dnsmasq)
		if [ "$i" -lt 1 ]; then
			echo "❌ dnsmasq重启失败，请检查你的dnsmasq配置！"
			return 1
		fi
		usleep 250000
	done

    print_line "dnsmasq complete"
}

# ==========================================
# 启动 sing-box 服务
# ==========================================
start_singbox() {
    # 相关路径
    local SINGBOX_BIN="${CUR_DIR}/bin/sing-box"
    local SINGBOX_CONF="${CUR_DIR}/conf/config.json"
    local SINGBOX_LOG="${CUR_DIR}/logs/sing-box.log"

    print_line "singbox"

    # 检查并清理可能残存的旧 sing-box 进程（防止重复启动套娃）
    if ps | grep -v grep | grep -q "$SINGBOX_BIN"; then
        echo "🔄 侦测到已存在的 sing-box 实例，正在重启..."
        killall -9 sing-box 2>/dev/null
        sleep 1
    fi

    # 检查核心文件是否存在
    if [ ! -f "$SINGBOX_BIN" ]; then
        echo "❌ 错误：在当前目录未找到 sing-box 二进制执行文件！"
        exit 1
    fi

    if [ ! -f "$SINGBOX_CONF" ]; then
        echo "❌ 错误：在当前目录未找到 config.json 配置文件！"
        exit 1
    fi

    # 防御性创建日志文件夹，防止 nonexistent directory 报错
    mkdir -p "${CUR_DIR}/logs"

    # 启动 sing-box 并将日志重定向到当前目录，且在后台长效运行
    echo "🚀 正在后台启动 sing-box 纯代理火箭..."
    nohup "$SINGBOX_BIN" run -c "$SINGBOX_CONF" > "$SINGBOX_LOG" 2>&1 &

    sleep 2

    # 验证是否成功驻留后台
    if ps | grep -v grep | grep -q "$SINGBOX_BIN"; then
        echo "🎉 sing-box 已经在后台稳稳垂钓！"
        echo "📝 实时日志已挂载至：$SINGBOX_LOG"

        # setup lan tproxy
        setup_lan_tproxy

        # setup oneself tproxy
        setup_oneself_tproxy

    else
        echo "❌ 启动失败！请检查 $SINGBOX_LOG 查看具体报错原因。"
    fi

    print_line "singbox complete"
}

#=========================================
# 停止 sing-box 服务
#=========================================
stop_singbox()
{
    print_line "stopping singbox"

    # 检查是否有正在运行的 sing-box 进程
    if ps | grep -v grep | grep -q "sing-box"; then
        echo "⚠️ 侦测到正在运行的 sing-box 实例，正在尝试停止..."
        killall -9 sing-box 2>/dev/null
        sleep 1
        echo "✅ sing-box 已成功停止。"
    else
        echo "🔍 未发现运行中的 sing-box 实例，无需停止。"
    fi

    print_line "singbox stop complete"
}

#=========================================
# 启动 smartdns 服务
#=========================================
start_smartdns() {
    print_line "smartdns"
    # 相关路径
    local SMARTDNS_BIN="${CUR_DIR}/bin/smartdns"
    local SMARTDNS_CONF="${CUR_DIR}/conf/smartdns.conf"
    local SMARTDNS_LOG="${CUR_DIR}/logs/smartdns.log"
    local dnsmasq_postconf="/jffs/scripts/dnsmasq.postconf"
    local dnsmasq_merlin_box_postconf="${CUR_DIR}/scripts/dnsmasq.postconf"

    # 由于要运行在53端口接管dnsmasq的53端口，所以需要先处理下dnsmasq

    # 将 merlin-box 自带的 dnsmasq.postconf 复制到 /jffs/scripts/
    if [ -f "$dnsmasq_merlin_box_postconf" ]; then
        echo "🔄 正在部署 $dnsmasq_merlin_box_postconf 到 /jffs/scripts/"
        \cp -f "$dnsmasq_merlin_box_postconf" "/jffs/scripts/dnsmasq.postconf"
        echo "✅ 部署完成"
    fi

    # 检查并清理可能残存的旧 smartdns 进程（防止端口占用）
    OLD_SMART_PID=$(ps | grep -v grep | grep "$SMARTDNS_BIN" | awk '{print $1}')

    if [ ! -z "$OLD_SMART_PID" ]; then
        echo "🔄 侦测到已有 smartdns 实例在运行 (PID: $OLD_SMART_PID)，正在重启..."
        kill -15 $OLD_SMART_PID 2>/dev/null
        sleep 1
        kill -9 $OLD_SMART_PID 2>/dev/null
        sleep 1
        echo "✅ 旧 smartdns 进程已彻底清理。"
    else
        # 额外兜底：有些固件可能直接运行全局的 smartdns 命令，也尝试清理一下
        if ps | grep -v grep | grep -q "smartdns"; then
            echo "⚠️ 发现非当前目录启动的 smartdns 进程，尝试一并清理以防端口冲突..."
            killall -9 smartdns 2>/dev/null
            sleep 1
        else
            echo "🔍 未发现运行中的旧 smartdns 进程。尝试停掉dnsmasq。"
            service stop_dnsmasq >/dev/null 2>&1
        fi
    fi

    # 检查核心文件是否存在
    if [ ! -f "$SMARTDNS_BIN" ]; then
        echo "❌ 错误：在当前目录未找到 smartdns 二进制执行文件！"
        exit 1
    fi

    if [ ! -f "$SMARTDNS_CONF" ]; then
        echo "❌ 错误：在当前目录未找到 smartdns.conf 配置文件！"
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
    # 使用 -f 参数在前台运行，因此配合 nohup 和 & 挂到后台，并将标准输出与错误重定向到日志
    echo "🚀 正在后台启动 smartdns 实例..."
    nohup "$SMARTDNS_BIN" -c "$SMARTDNS_CONF" -f > "$SMARTDNS_LOG" 2>&1 &

    sleep 2

    # 验证是否成功驻留后台并接管 DNS
    if ps | grep -v grep | grep "$SMARTDNS_BIN" | grep -q -- "-f"; then
        echo "🎉 smartdns 已成功在后台挂载运行！"
        echo "📝 运行日志已重定向至：$SMARTDNS_LOG"
        echo "💡 提示：你可以使用 'netstat -nlp | grep smartdns' 或查看日志来确认端口监听情况。"

        # 拦截局域网 DNS 53 端口流量送入 smartdns
        setup_dns_hijack

    else
        echo "❌ 启动失败！请检查 $SMARTDNS_LOG 查看具体报错原因。"
    fi

    print_line "smartdns complete"
}

#=========================================
# 停止 smartdns 服务
#=========================================
stop_smartdns() {
    print_line "stopping smartdns"

    # 检查是否有正在运行的 smartdns 进程
    if ps | grep -v grep | grep -q "smartdns"; then
        echo "⚠️ 侦测到正在运行的 smartdns 实例，正在尝试停止..."
        killall -15 smartdns 2>/dev/null
        sleep 1
        killall -9 smartdns 2>/dev/null
        sleep 1
        echo "✅ smartdns 已成功停止。"
    else
        echo "🔍 未发现运行中的 smartdns 实例，无需停止。"
    fi

    # 删除 dnsmasq.postconf 文件
    local dnsmasq_postconf="/jffs/scripts/dnsmasq.postconf"

    if [ -f "$dnsmasq_postconf" ]; then
        echo "🔄 检测到 dnsmasq.postconf，正在删除..."
        \rm -f "$dnsmasq_postconf"
        echo "✅ 删除完成：$dnsmasq_postconf"
    else
        echo "🔍 未检测到 dnsmasq.postconf，无需删除。"
    fi

    print_line "smartdns stop complete"
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

    print_line "lan dns hijack setup complete"

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

    print_line "lan dns v6 hijack setup complete"
}

#=========================================
# 局域网常规流量 TPROXY 透明代理封装
#=========================================
setup_lan_tproxy()
{
    print_line "setting up lan tproxy and quic block"

    # 1. 局域网互访放行
    iptables -t mangle -A "$MB_PROXY_CHAIN" -d 192.168.0.0/16 -j RETURN
    iptables -t mangle -A "$MB_PROXY_CHAIN" -d 172.16.0.0/12 -j RETURN
    iptables -t mangle -A "$MB_PROXY_CHAIN" -d 10.0.0.0/8 -j RETURN

    # 2. 匹配 IPSET 白名单集合的 TCP 流量直接 RETURN（直连放行）
    iptables -t mangle -A "$MB_PROXY_CHAIN" -p tcp -m set --match-set "$MB_IPSET_NAME" dst -j RETURN

    # 3. 仅在开关开启时屏蔽局域网的 QUIC (UDP 443)
    if [ "$MB_DISABLE_QUIC_FROM_LAN" = "1" ]; then
        iptables -t mangle -A "$MB_PROXY_CHAIN" -p udp --dport 443 -j DROP
    fi

    # 4. 剩余流量全部送入 TPROXY，使用全局变量端口和打标值
    iptables -t mangle -A "$MB_PROXY_CHAIN" -p tcp -j TPROXY --on-port "$MB_TPROXY_PORT" --tproxy-mark "$MB_FWMARK"
    #iptables -t mangle -A "$MB_PROXY_CHAIN" -p udp -j TPROXY --on-port "$MB_TPROXY_PORT" --tproxy-mark "$MB_FWMARK"

    # 5. 主链去重清理与排除 DNS 53 - 保持不变
    iptables -t mangle -D PREROUTING -i br0 -p tcp --dport 53 -j RETURN 2>/dev/null
    iptables -t mangle -D PREROUTING -i br0 -j "$MB_PROXY_CHAIN" 2>/dev/null
    iptables -t mangle -A PREROUTING -i br0 -p tcp --dport 53 -j RETURN
    iptables -t mangle -A PREROUTING -i br0 -j "$MB_PROXY_CHAIN"

    print_line "lan tproxy setup complete"

    setup_lan_tproxy_ipv6
}

# ==========================================
# 局域网常规流量 TPROXY 透明代理封装 (IPv6 专属，仅 TCP)
# ==========================================
setup_lan_tproxy_ipv6()
{
    [ "$MB_ENABLE_IPV6" != "1" ] && return 0
    print_line "setting up lan tproxy v6 and quic block"

    # 1. 局域网本地特殊 v6 网段直连放行（必须放行 fe80::/10 链路本地地址和私有本地地址）
    ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p tcp -d ::1/128 -j RETURN
    ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p tcp -d fe80::/10 -j RETURN
    ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p tcp -d fc00::/7 -j RETURN

    # 2. 匹配 IPSET 大陆 IPv6 白名单网段直接直连放行
    ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p tcp -m set --match-set "$MB_IPSET_NAME_V6" dst -j RETURN

    # 3. 仅在开关开启时屏蔽局域网的 v6 QUIC (UDP 443)
    if [ "$MB_DISABLE_QUIC_FROM_LAN" = "1" ]; then
        ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p udp --dport 443 -j DROP
    fi

    # 4. 剩余 TCP 流量全部送入 TPROXY 本地端口
    ip6tables -t mangle -A "$MB_PROXY_CHAIN_V6" -p tcp -j TPROXY --on-port "$MB_TPROXY_PORT" --tproxy-mark "$MB_FWMARK"

    # 5. 主链去重清理与排除 TCP DNS 53
    ip6tables -t mangle -D PREROUTING -i br0 -p tcp --dport 53 -j RETURN 2>/dev/null
    ip6tables -t mangle -D PREROUTING -i br0 -j "$MB_PROXY_CHAIN_V6" 2>/dev/null

    ip6tables -t mangle -A PREROUTING -i br0 -p tcp --dport 53 -j RETURN
    ip6tables -t mangle -A PREROUTING -i br0 -j "$MB_PROXY_CHAIN_V6"

    print_line "lan tproxy v6 setup complete"
}

#=========================================
# 初始化与重置防火墙及策略路由
#=========================================
reset_iptables()
{
    print_line "resetting iptables and routing rules"

    # ----------------------------------------------------------
    # A. 自定义链重置 (优先执行，彻底洗空内容，解除对 ipset 的引用)
    # ----------------------------------------------------------
    # 重置 nat 表的 DNS 链
    iptables -t nat -F "$MB_DNS_CHAIN" 2>/dev/null
    iptables -t nat -X "$MB_DNS_CHAIN" 2>/dev/null
    if ! iptables -t nat -L "$MB_DNS_CHAIN" >/dev/null 2>&1; then
        iptables -t nat -N "$MB_DNS_CHAIN"
    fi

    # 重置 mangle 表的代理链（这一步执行完，对 ipset 的引用就断了）
    iptables -t mangle -F "$MB_PROXY_CHAIN" 2>/dev/null
    iptables -t mangle -X "$MB_PROXY_CHAIN" 2>/dev/null
    if ! iptables -t mangle -L "$MB_PROXY_CHAIN" >/dev/null 2>&1; then
        iptables -t mangle -N "$MB_PROXY_CHAIN"
    fi

    # ----------------------------------------------------------
    # B. 初始化 IPSET 大陆白名单集合 (此时可以安全 destroy)
    # ----------------------------------------------------------
    echo "⏳ 正在加载 IPSET 大陆白名单分流集合..."
    ipset destroy "$MB_IPSET_NAME" 2>/dev/null
    ipset create "$MB_IPSET_NAME" hash:net

    if [ -f "$MB_CHN_IP4_FILE" ]; then
        dos2unix "$MB_CHN_IP4_FILE" 2>/dev/null
        (echo "create $MB_IPSET_NAME hash:net -exist" ; awk '{print "add '"$MB_IPSET_NAME"'" , $0}' "$MB_CHN_IP4_FILE") | ipset restore 2>/dev/null
        echo "✅ 成功将白名单 IP 网段加载至 ipset 集合。"
    else
        echo "⚠️ 未找到白名单文件: $MB_CHN_IP4_FILE，分流功能将不生效！"
    fi

    #检测是否存在 MB_CHN_IP4_WHITELIST_FILE 这个文件, 如果存在, 也要加载到 ipset 中
    if [ -f "$MB_CHN_IP4_WHITELIST_FILE" ]; then
        dos2unix "$MB_CHN_IP4_WHITELIST_FILE" 2>/dev/null
        (echo "create $MB_IPSET_NAME hash:net -exist" ; awk '{print "add '"$MB_IPSET_NAME"'" , $0}' "$MB_CHN_IP4_WHITELIST_FILE") | ipset restore 2>/dev/null
        echo "✅ 成功将自定义白名单 IP 网段加载至 ipset 集合。"
    else
        echo "⚠️ 未找到自定义白名单文件: $MB_CHN_IP4_WHITELIST_FILE 。"
    fi

    # ----------------------------------------------------------
    # C. 策略路由重置 (ip rule / ip route)
    # ----------------------------------------------------------
    while ip rule del fwmark "$MB_FWMARK" table "$MB_ROUTE_TABLE" 2>/dev/null; do
        :
    done
    ip route flush table "$MB_ROUTE_TABLE" 2>/dev/null
    ip rule add fwmark "$MB_FWMARK" table "$MB_ROUTE_TABLE"
    ip route add local default dev lo table "$MB_ROUTE_TABLE"

    print_line "reset complete"

    reset_iptables_ipv6
}

# ==========================================
# 初始化与重置防火墙及策略路由 (IPv6 专属)
# ==========================================
reset_iptables_ipv6()
{
    [ "$MB_ENABLE_IPV6" != "1" ] && return 0
    print_line "resetting iptables v6 and routing rules"

    # 1. 重置 ip6tables 自定义链引用，防止 ipset 销毁失败
    ip6tables -t mangle -F "$MB_PROXY_CHAIN_V6" 2>/dev/null
    ip6tables -t mangle -F "$MB_ONESELF_CHAIN_V6" 2>/dev/null

    # 2. 初始化 IPSET 大陆 v6 白名单集合
    echo "⏳ 正在加载 IPSET 大陆 IPv6 白名单分流集合..."
    ipset destroy "$MB_IPSET_NAME_V6" 2>/dev/null
    # 注意：IPv6 的集合类型必须声明为 hash:net 为 family inet6
    ipset create "$MB_IPSET_NAME_V6" hash:net family inet6 -exist

    if [ -f "$MB_CHN_IP6_FILE" ]; then
        dos2unix "$MB_CHN_IP6_FILE" 2>/dev/null
        (echo "create $MB_IPSET_NAME_V6 hash:net family inet6 -exist" ; awk '{print "add '"$MB_IPSET_NAME_V6"'" , $0}' "$MB_CHN_IP6_FILE") | ipset restore 2>/dev/null
        echo "✅ 成功将白名单 IPv6 网段加载至 ipset 集合。"
    else
        echo "⚠️ 未找到 IPv6 白名单文件: $MB_CHN_IP6_FILE，IPv6 分流功能将不生效！"
    fi

    # 检测是否存在 MB_CHN_IP6_WHITELIST_FILE 这个文件, 如果存在, 也要加载到 ipset 中
    if [ -f "$MB_CHN_IP6_WHITELIST_FILE" ]; then
        dos2unix "$MB_CHN_IP6_WHITELIST_FILE" 2>/dev/null
        (echo "create $MB_IPSET_NAME_V6 hash:net family inet6 -exist" ; awk '{print "add '"$MB_IPSET_NAME_V6"'" , $0}' "$MB_CHN_IP6_WHITELIST_FILE") | ipset restore 2>/dev/null
        echo "✅ 成功将自定义白名单 IPv6 网段加载至 ipset 集合。"
    else
        echo "⚠️ 未找到自定义白名单文件: $MB_CHN_IP6_WHITELIST_FILE 。"
    fi

    # 3. 策略路由重置 (使用 ip -6 命令)
    while ip -6 rule del fwmark "$MB_FWMARK" table "$MB_ROUTE_TABLE" 2>/dev/null; do
        :
    done
    ip -6 route flush table "$MB_ROUTE_TABLE" 2>/dev/null
    ip -6 rule add fwmark "$MB_FWMARK" table "$MB_ROUTE_TABLE"
    # 将 v6 流量掉头撞向本地回环
    ip -6 route add local default dev lo table "$MB_ROUTE_TABLE"

    # 4. 自定义链重建 (ip6tables nat 表)
    ip6tables -t nat -F "$MB_DNS_CHAIN_V6" 2>/dev/null
    ip6tables -t nat -X "$MB_DNS_CHAIN_V6" 2>/dev/null
    if ! ip6tables -t nat -L "$MB_DNS_CHAIN_V6" >/dev/null 2>&1; then
        ip6tables -t nat -N "$MB_DNS_CHAIN_V6"
    fi

    # 5. 自定义链重建 (ip6tables mangle 表)
    ip6tables -t mangle -F "$MB_PROXY_CHAIN_V6" 2>/dev/null
    ip6tables -t mangle -X "$MB_PROXY_CHAIN_V6" 2>/dev/null
    if ! ip6tables -t mangle -L "$MB_PROXY_CHAIN_V6" >/dev/null 2>&1; then
        ip6tables -t mangle -N "$MB_PROXY_CHAIN_V6"
    fi

    print_line "reset v6 complete"
}

#=========================================
# 清理 iptables 规则与策略路由
#=========================================
clear_iptables()
{
    print_line "clear iptables and routing rules"

    # ----------------------------------------------------------
    # 1. 拔除主链（PREROUTING）中的引流规则
    # ----------------------------------------------------------
    iptables -t nat -D PREROUTING -i br0 -p udp --dport 53 -j "$MB_DNS_CHAIN" 2>/dev/null
    iptables -t nat -D PREROUTING -i br0 -p tcp --dport 53 -j "$MB_DNS_CHAIN" 2>/dev/null

    iptables -t mangle -D PREROUTING -i br0 -p tcp --dport 53 -j RETURN 2>/dev/null
    iptables -t mangle -D PREROUTING -i br0 -p udp --dport 53 -j RETURN 2>/dev/null
    iptables -t mangle -D PREROUTING -i br0 -j "$MB_PROXY_CHAIN" 2>/dev/null

    iptables -t mangle -D OUTPUT -p tcp -j "$MB_ONESELF_CHAIN" 2>/dev/null

    # ==========================================================
    # 1. 清理 nat 表的 DNS 链
    # ==========================================================
    iptables -t nat -F "$MB_DNS_CHAIN" 2>/dev/null
    iptables -t nat -X "$MB_DNS_CHAIN" 2>/dev/null

    # ==========================================================
    # 2. 清理 mangle 表的代理链
    # ==========================================================
    iptables -t mangle -F "$MB_PROXY_CHAIN" 2>/dev/null
    iptables -t mangle -X "$MB_PROXY_CHAIN" 2>/dev/null
    iptables -t mangle -F "$MB_ONESELF_CHAIN" 2>/dev/null
    iptables -t mangle -X "$MB_ONESELF_CHAIN" 2>/dev/null

    # ----------------------------------------------------------
    # 3. 释放策略路由与路由表（新增）
    # ----------------------------------------------------------
    # 删除策略路由条目
    while ip rule del fwmark "$MB_FWMARK" table "$MB_ROUTE_TABLE" 2>/dev/null; do
        :
    done

    # 彻底清空并擦除自定义路由表 100
    ip route flush table "$MB_ROUTE_TABLE" 2>/dev/null
    # 销毁 ipset 白名单集合
    ipset destroy "$MB_IPSET_NAME" 2>/dev/null

    print_line "clear complete"

    clear_iptables_ipv6
}

# ==========================================
# 清理 iptables 规则与策略路由 (IPv6 专属)
# ==========================================
clear_iptables_ipv6()
{
    print_line "clear iptables v6 and routing rules"

    # 1. 拔除主链（PREROUTING / OUTPUT）中的引流路标
    ip6tables -t nat -D PREROUTING -i br0 -p udp --dport 53 -j "$MB_DNS_CHAIN_V6" 2>/dev/null
    ip6tables -t nat -D PREROUTING -i br0 -p tcp --dport 53 -j "$MB_DNS_CHAIN_V6" 2>/dev/null

    ip6tables -t mangle -D PREROUTING -i br0 -p tcp --dport 53 -j RETURN 2>/dev/null
    ip6tables -t mangle -D PREROUTING -i br0 -j "$MB_PROXY_CHAIN_V6" 2>/dev/null

    ip6tables -t mangle -D OUTPUT -p tcp -j "$MB_ONESELF_CHAIN_V6" 2>/dev/null

    # 2. 彻底销毁自定义链
    ip6tables -t nat -F "$MB_DNS_CHAIN_V6" 2>/dev/null
    ip6tables -t nat -X "$MB_DNS_CHAIN_V6" 2>/dev/null

    ip6tables -t mangle -F "$MB_PROXY_CHAIN_V6" 2>/dev/null
    ip6tables -t mangle -X "$MB_PROXY_CHAIN_V6" 2>/dev/null
    ip6tables -t mangle -F "$MB_ONESELF_CHAIN_V6" 2>/dev/null
    ip6tables -t mangle -X "$MB_ONESELF_CHAIN_V6" 2>/dev/null

    # 3. 释放 v6 策略路由与清除 IPSET
    while ip -6 rule del fwmark "$MB_FWMARK" table "$MB_ROUTE_TABLE" 2>/dev/null; do
        :
    done
    ip -6 route flush table "$MB_ROUTE_TABLE" 2>/dev/null

    ipset destroy "$MB_IPSET_NAME_V6" 2>/dev/null

    print_line "clear v6 complete"
}

#=========================================
# 路由器本机流量透明代理封装（仅 TCP）
#=========================================
setup_oneself_tproxy()
{
    print_line "setting up router oneself tcp proxy"

    # ----------------------------------------------------------
    # 1. 初始化与重建 mangle 表的本机代理链
    # ----------------------------------------------------------
    iptables -t mangle -F "$MB_ONESELF_CHAIN" 2>/dev/null
    iptables -t mangle -X "$MB_ONESELF_CHAIN" 2>/dev/null
    if ! iptables -t mangle -L "$MB_ONESELF_CHAIN" >/dev/null 2>&1; then
        iptables -t mangle -N "$MB_ONESELF_CHAIN"
    fi

    # ----------------------------------------------------------
    # 2. 填充本机代理链规则（自上而下，严格白名单放行）
    # ----------------------------------------------------------

    # 规则 A: 放行发往本地回环和局域网的流量（包含 SmartDNS 走 127.0.0.1 的情况，以及本地 DNS 请求）
    iptables -t mangle -A "$MB_ONESELF_CHAIN" -d 127.0.0.0/8 -j RETURN
    iptables -t mangle -A "$MB_ONESELF_CHAIN" -d 192.168.0.0/16 -j RETURN
    iptables -t mangle -A "$MB_ONESELF_CHAIN" -d 172.16.0.0/12 -j RETURN
    iptables -t mangle -A "$MB_ONESELF_CHAIN" -d 10.0.0.0/8 -j RETURN

    # 规则 B: 放行 Sing-box 自身发出的外网流量（通过识别出站 mark 255，绝对防止死循环）
    iptables -t mangle -A "$MB_ONESELF_CHAIN" -m mark --mark "$MB_SINGBOX_OUT_MARK" -j RETURN

    # 规则 C: 路由器本机发往白名单 IP 集合的 TCP 流量直接 RETURN（直连放行）
    iptables -t mangle -A "$MB_ONESELF_CHAIN" -p tcp -m set --match-set "$MB_IPSET_NAME" dst -j RETURN

    # 规则 D: 放行 SmartDNS 直连公网的上游 DNS 流量
    # 如果你的 SmartDNS 配置了直连非 53 端口的 DoT/DoH 上游，请在这里补充对应的端口（如 853）。
    # 这里我们放行本地发往外网所有 53, 853 端口的 TCP 流量，确保 SmartDNS 直连查询不被 sing-box 拦截
    iptables -t mangle -A "$MB_ONESELF_CHAIN" -p tcp --dport 53 -j RETURN
    #iptables -t mangle -A "$MB_ONESELF_CHAIN" -p tcp --dport 853 -j RETURN

    # 规则 E: 终极捕获！将剩余的本机本地【仅 TCP】流量打上代理标记，送入策略路由
    # 注意：本机流量不能用 -j TPROXY（TPROXY只能用于PREROUTING），本机流量必须改用 -j MARK
    iptables -t mangle -A "$MB_ONESELF_CHAIN" -p tcp -j MARK --set-xmark "$MB_FWMARK"

    # ----------------------------------------------------------
    # 3. 主链（OUTPUT）挂载与去重
    # ----------------------------------------------------------
    # 防御性清理老规则
    iptables -t mangle -D OUTPUT -p tcp -j "$MB_ONESELF_CHAIN" 2>/dev/null

    # 正式引流：将路由器本机产生的所有 TCP 流量引入自定义链
    iptables -t mangle -A OUTPUT -p tcp -j "$MB_ONESELF_CHAIN"

    print_line "router oneself tcp proxy setup complete"

    setup_oneself_tproxy_ipv6
}

# ==========================================
# 路由器本机流量透明代理封装 (IPv6 专属，仅 TCP)
# ==========================================
setup_oneself_tproxy_ipv6()
{
    [ "$MB_ENABLE_IPV6" != "1" ] && return 0
    print_line "setting up router oneself tcp proxy v6"

    ip6tables -t mangle -F "$MB_ONESELF_CHAIN_V6" 2>/dev/null
    ip6tables -t mangle -X "$MB_ONESELF_CHAIN_V6" 2>/dev/null
    if ! ip6tables -t mangle -L "$MB_ONESELF_CHAIN_V6" >/dev/null 2>&1; then
        ip6tables -t mangle -N "$MB_ONESELF_CHAIN_V6"
    fi

    # 规则 A: 放行回环、链路本地和 ULA 私有本地地址
    ip6tables -t mangle -A "$MB_ONESELF_CHAIN_V6" -d ::1/128 -j RETURN
    ip6tables -t mangle -A "$MB_ONESELF_CHAIN_V6" -d fe80::/10 -j RETURN
    ip6tables -t mangle -A "$MB_ONESELF_CHAIN_V6" -d fc00::/7 -j RETURN

    # 规则 B: 放行 Sing-box 自身发出的外网 v6 流量（绝对防止本地死循环）
    ip6tables -t mangle -A "$MB_ONESELF_CHAIN_V6" -m mark --mark "$MB_SINGBOX_OUT_MARK" -j RETURN

    # 规则 C: 路由器本机发往 IPv6 大陆白名单集合的流量直连放行
    ip6tables -t mangle -A "$MB_ONESELF_CHAIN_V6" -p tcp -m set --match-set "$MB_IPSET_NAME_V6" dst -j RETURN

    # 规则 D: 放行本机发往公网的 DNS TCP 流量
    ip6tables -t mangle -A "$MB_ONESELF_CHAIN_V6" -p tcp --dport 53 -j RETURN

    # 规则 E: 终极捕获打标，逼迫本机剩余的 TCP 流量掉头撞向本地代理
    ip6tables -t mangle -A "$MB_ONESELF_CHAIN_V6" -p tcp -j MARK --set-xmark "$MB_FWMARK"

    # 主链挂载与去重
    ip6tables -t mangle -D OUTPUT -p tcp -j "$MB_ONESELF_CHAIN_V6" 2>/dev/null
    ip6tables -t mangle -A OUTPUT -p tcp -j "$MB_ONESELF_CHAIN_V6"

    print_line "router oneself tcp proxy v6 setup complete"
}

# ==========================================
# 使用upx压缩 一个可执行文件
# 接收一个参数：要压缩的可执行文件路径
# ==========================================
compress_executable_with_upx() {
    local executable_path="$1"

    if [ ! -f "$executable_path" ]; then
        echo "❌ 错误：指定的可执行文件不存在：$executable_path"
        return 1
    fi

    if ! command -v upx >/dev/null 2>&1; then
        echo "⚠️ 警告：未检测到 upx 工具，无法进行压缩。请先安装 upx。https://github.com/upx/upx/releases "
        return 1
    fi

    echo "⏳ 正在使用 upx 压缩可执行文件：$executable_path"
    upx --lzma --ultra-brute "$executable_path" #--lzma启动时会稍微慢一些
    #upx --best "$executable_path"

    if [ $? -eq 0 ]; then
        echo "✅ 压缩完成：$executable_path"
    else
        echo "❌ 压缩失败，请检查 upx 输出信息。"
        return 1
    fi
}
