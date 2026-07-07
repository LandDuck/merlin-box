# 🚀 merlin-box

基于 **ASUSWRT-Merlin** 路由器环境的 **sing-box + smartdns** 分流代理脚本方案。

本项目目标是把职责拆分清晰：

- 🛰️ sing-box 只负责代理转发
- 🌐 smartdns 负责域名解析与域名分流
- 📦 ipset + iptables/ip6tables 负责 IP 分流与透明代理引流

---

# 📋 当前功能与限制

| 项目 | 状态 | 说明 |
|------|------|------|
| IPv4 / IPv6 | ✅ 已支持 | 启动时自动检测 IPv6，可用则启用，不可用则自动降级到 IPv4 |
| IPv4 / IPv6 分流 | ✅ 已支持 | ipset + iptables/ip6tables |
| LAN 侧 QUIC（UDP 443） | ✅ 已处理 | 默认拦截（DROP UDP 443），避免 UDP 直连泄露 |
| smartdns 解析分流 | ✅ 已支持 | 由 smartdns 替代 dnsmasq 承担 DNS 解析与域名分流 |
| UDP | ⏳ 暂不支持 | -- |
| ping 代理 | ⏳ 暂不支持 | 不在当前代理范围内 |

### 💡 说明

- 当前仅代理 TCP。
- IPv6 需要本地网络和上游服务器均支持；脚本会自动检测 IPv6 可用性，不可用时自动降级到 IPv4 流程。
- QUIC 属于 UDP，项目当前采取拦截方案（DROP UDP 443），因此会导致依赖 H3/QUIC 的网站在客户端侧无法以 QUIC 访问（通常会回退到 TCP/TLS；个别站点可能表现为打不开或异常）。

---

# ⚙️ 核心运行逻辑

## 🌍 域名分流（smartdns）

- `res/chn-site.txt` 作为域名集合
- 命中域名 -> 使用中国 DNS 上游解析（`china` 组）
- 其他域名 -> 走国际 DNS 上游（`foreign` 组，默认经 socks5 代理）

对应配置位置：

- `conf/smartdns.conf`

---

## 📡 IP 分流（ipset + iptables/ip6tables）

- `res/chn-ip4.txt`、`res/chn-ip6.txt` 作为 IP 网段集合
- 启动时加载到 ipset 集合：
    - IPv4：`merlinkbox_chn`
    - IPv6：`merlinkbox_chn_v6`
- 命中 IP 集合 -> 直连放行
- 未命中 -> 透明代理引流到 sing-box TPROXY 端口

可选白名单文件：

- 在此白名单中的 IP 将被视为直连。
    - `res/chn-ip4-whitelist.txt`
    - `res/chn-ip6-whitelist.txt`

---

## 🚀 代理执行（sing-box）

- 入站：
    - SOCKS：`65001`（供 smartdns foreign 上游经代理解析）
    - TPROXY：`65002`（供透明代理接收）
- 出站：在 `conf/config.json` 自行配置

对应配置位置：

- `conf/config.json`

---

# 📁 目录结构

```text
merlin-box/
├─ merlin-box.sh            # 主入口脚本（start/stop）
├─ bin/
│  ├─ sing-box              # sing-box 可执行文件
│  └─ smartdns              # smartdns 可执行文件
├─ conf/
│  ├─ config.json           # sing-box 配置
│  └─ smartdns.conf         # smartdns 配置
├─ scripts/
│  └─ dnsmasq.postconf      # dnsmasq 后处理脚本（接管 53 端口时使用）
├─ sh/
│  └─ fun.sh                # 核心逻辑
└─ res/
   ├─ chn-ip4.txt
   ├─ chn-ip6.txt
   └─ chn-site.txt
```

### ⚠️ 注意

- 脚本默认会在项目目录下读取 `bin/sing-box` 与 `bin/smartdns`，并写日志到 `logs/`。
- 目前包含的二进制文件，仅在 BE-86U 测试通过，其它机型请自行编译或下载对应版本。

---

# 🖥️ 适用环境与机型说明

- ✅ 已测试成功机型：BE-86U
- ✅ 理论上更高配、更新的 Merlin 机型可用
- ⏳ 更多其他机型因设备有限暂未覆盖
- 💾 完整版 sing-box 体积较大，若路由器 jffs 空间较小，建议挂载 U 盘
- 📂 可在 U 盘任意目录放置项目并执行脚本

---

# 🚀 快速部署

## 📦 准备文件

1. 将本项目上传到路由器（jffs 或 U 盘挂载目录均可）
2. 准备可执行文件并放入（项目自带的可在 BE-86U 运行）：
    - `bin/sing-box`
    - `bin/smartdns`
3. 给予执行权限（示例）：

```bash
chmod +x merlin-box.sh
chmod +x bin/sing-box
chmod +x bin/smartdns
chmod +x scripts/dnsmasq.postconf
```

---

## 🔧 修改配置

### 1. 修改 `conf/config.json`（sing-box 配置）

- 按你的节点信息配置 outbounds
- 确认 sing-box outbound `routing_mark` 与脚本变量一致（默认 `169`）

### 2. 修改 `conf/smartdns.conf`

- 按需替换中国/国际 DNS 上游
- 保持域名分流规则（`chn-site.txt`）

### 3. 如需额外直连 IP，可创建并维护：

- `res/chn-ip4-whitelist.txt`
- `res/chn-ip6-whitelist.txt`

---

## ▶️ 启停命令

主入口命令：

```bash
./merlin-box.sh start
./merlin-box.sh stop
./merlin-box.sh -h
./merlin-box.sh -v
```

脚本行为摘要：

- ▶️ `start`：清理旧规则 -> 启动 sing-box -> 启动 smartdns -> 重启 dnsmasq
- ⏹️ `stop`：停止 sing-box/smartdns -> 清理 iptables/ip6tables/ip rule/ipset -> 重启 dnsmasq

---

# 📡 协议支持

理论上 sing-box 支持的协议，只要在 `conf/config.json` 正确配置，均可接入本方案。

---

# 🙏 参考项目

- sing-box  
  https://github.com/sagernet/sing-box

- smartdns  
  https://github.com/pymumu/smartdns

- fancyss  
  https://github.com/hq450/fancyss

---

# 📜 LICENSE
MIT License
