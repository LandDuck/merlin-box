# 🚀 merlin-box

#### 🌐 Languages

- 简体中文
- [English](README.md)

基于 **ASUSWRT-Merlin** 路由器环境的 **sing-box + smartdns** 分流代理脚本方案。

本项目目标是把职责拆分清晰：

- 🛰️ sing-box 只负责代理转发
- 🌐 smartdns 负责域名解析与域名分流
- 📦 ipset + iptables/ip6tables 负责 IP 分流与透明代理引流

---

# 📋 当前功能与限制

<table>
  <thead>
    <tr>
      <th width="180">项目</th>
      <th width="120">状态</th>
      <th>说明</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>IPv4 / IPv6</td>
      <td>✅ 已支持</td>
      <td>
        启动时自动检测 IPv6，可用则启用，不可用则自动降级到 IPv4。<br>
        可修改 merlin-box.sh 中的 MB_ENABLE_IPV6 变量值手动禁用 IPv6。
      </td>
    </tr>
    <tr>
      <td>IPv4 / IPv6 分流</td>
      <td>✅ 已支持</td>
      <td>
        ipset + iptables/ip6tables
      </td>
    </tr>
    <tr>
      <td>屏蔽 LAN 侧 QUIC <br />UDP 443</td>
      <td>✅ 已处理</td>
      <td>
        默认拦截（DROP UDP 443），避免 UDP 直连泄露。<br>
        可修改 merlin-box.sh 中的 MB_DISABLE_QUIC_FROM_LAN 变量手动禁用拦截功能。
      </td>
    </tr>
    <tr>
      <td>smartdns 解析分流</td>
      <td>✅ 已支持</td>
      <td>
        由 smartdns 替代 dnsmasq 承担 DNS 解析与域名分流。
      </td>
    </tr>
    <tr>
      <td>广告拦截</td>
      <td>✅ 已支持</td>
      <td>
        通过配置 site-blocklist.txt 黑洞域名列表实现。
      </td>
    </tr>
    <tr>
      <td>域名黑名单</td>
      <td>✅ 已支持</td>
      <td>
        通过配置 site-blacklist.txt 黑名单域名列表使指定域名强制走代理。
      </td>
    </tr>
    <tr>
      <td>IP白名单</td>
      <td>✅ 已支持</td>
      <td>
        通过配置 ip4-whitelist.txt 和 ip6-whitelist.txt 文件实现，使指定 IP 强制直连。
      </td>
    </tr>
    <tr>
      <td>UDP</td>
      <td>✅ 已支持</td>
      <td>
        UDP默认是关闭的，若需要使用 UDP 代理，需要将 merlin-box.sh 中的 MB_ENABLE_UDP 变量值修改为 1。
      </td>
    </tr>
    <tr>
      <td>路由自身</td>
      <td>✅ 已支持</td>
      <td>
        仅 TCP 代理，默认关闭。需要将 merlin-box.sh 中的 MB_ENABLE_ONESELF_PROXY 变量值修改为 1。 
      </td>
    </tr>
    <tr>
      <td>设备黑名单</td>
      <td>✅ 已支持</td>
      <td>
        防止邻居蹭网误入 <b>迷失深林🌳</b> 。 在 device_blacklist.txt 中配置邻居设备的 MAC 地址即可。
      </td>
    </tr>
    <tr>
      <td>设备白名单</td>
      <td>✅ 已支持</td>
      <td>
        使用白名单可以防止未授权的来宾用户误入 <b>迷失深林🌳</b> 。 在 device_whitelist.txt 中配置常用设备 MAC 地址即可。
      </td>
    </tr>
    <tr>
      <td>ping 代理</td>
      <td>⏳ 暂不支持</td>
      <td>
        不在当前代理范围内。
      </td>
    </tr>
    <tr>
      <td>UI</td>
      <td>⏳ 暂不支持</td>
      <td>
        长远有计划支持。大概率用 GO 直接跑一个WEB服务写一套独立的WEB UI。
      </td>
    </tr>
  </tbody>
</table>

### 💡 说明

- UDP 代理需要上游节点支持，且 sing-box 需要配置支持 UDP 的出站。
- 路由自身的代理功能需要在 sing-box 配置中添加一条 redirect 入站。
- IPv6 需要本地网络和上游服务器均支持；MB_ENABLE_IPV6=1 时脚本会自动检测本地网络 IPv6 可用性，不可用时自动降级到 IPv4 流程。
- ⚠️脚本无法检测上游服务器是否支持 IPv6，若上游不支持 IPv6，且 MB_ENABLE_IPV6=1，由于会走IPV6优先模式，可能导致无法上网。
- QUIC 属于 UDP，无论是否开启 UDP 代理，项目均采取拦截方案（DROP UDP 443），因此会导致依赖 H3/QUIC 的网站在客户端侧无法以 QUIC 访问（通常会回退到 TCP/TLS；个别站点可能表现为打不开或异常）。
- ⚠️设备黑白名单功能依赖  device_blacklist.txt/device_whitelist.txt 文件是否存在，只要文件存在，脚本就会启用黑/白名单功能，如果不需要此功能，请删除这两个文件。

---

# ⚙️ 核心运行逻辑

## 🌍 域名分流（smartdns）

- `res/chn-site.txt` 作为域名集合
- 命中域名 -> 使用中国 DNS 上游解析（`china` 组）
- 其他域名 -> 走国际 DNS 上游（`foreign` 组，默认经 socks5 代理）

smartdns 配置：

- 配置文件 `conf/smartdns.conf`
- 配置参考 https://pymumu.github.io/smartdns/en/configuration/

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
    - `res/ip4-whitelist.txt`
    - `res/ip6-whitelist.txt`

---

## 🚀 代理执行（sing-box）

- 入站：
    - SOCKS：`65001`（供 smartdns foreign 上游经代理解析）
    - TPROXY：`65002`（供透明代理接收）
- 出站：在 `conf/config.json` 自行配置

sing-box（conf/config.json）配置参考：

- https://sing-box.sagernet.org/configuration/

---

# 📁 目录结构

```text
merlin-box/
├─ merlin-box.sh            # 主入口脚本（start/stop）
├─ start_merlin_box.sh      # 用于支持开机启动
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
   ├─ chn-ip4.txt           # 中国 IPv4
   ├─ chn-ip6.txt           # 中国 IPv6
   ├─ chn-site.txt          # 中国域名列表
   ├─ device_blacklist.txt  # 设备黑名单列表(设备不能走代理)
   ├─ device_whitelist.txt  # 设备白名单列表(仅允许的设备可以走代理)
   ├─ site-blocklist.txt    # 屏蔽域名列表(进入黑洞)
   └─ site-blacklist.txt    # 黑名单域名列表(强制走代理)
```

### ⚠️ 注意

- 脚本默认会在项目中找 `bin/sing-box` 与 `bin/smartdns` 来启动相关服务，并将控制台输出重定向到 `logs/sing-box.log` 和 `logs/smartdns.log`。
- 目前包含的二进制文件在下面的设备上测试通过（没有更多机型供测试）。

| 型号     | SINGBOX          | SMARTDNS         |
|----------|------------------|------------------|
| RT-BE86U | linux-arm64-musl | smartdns-aarch64 |
| RT-AC86U | linux-arm64-musl | smartdns-aarch64 |

---

# 🖥️ 适用环境与机型说明

- ✅ 已测试成功机型：RT-BE86U、RT-AC86U。
- ✅ 理论上更高配、更新的机型（arm64）可直接用。
- ⏳ 更多其他机型因设备有限暂未覆盖，可下载对应架构的 sing-box 与 smartdns 替换并尝试。
- 💾 完整版 sing-box 体积较大，若路由器 jffs 空间较小，建议挂载 U 盘。
- 📂 可在 U 盘任意目录放置项目并执行脚本。

---

# 🚀 快速部署

## 📦 准备文件

1. 将本项目上传到路由器（jffs 或 U 盘挂载目录均可）
2. 准备可执行文件并放入（项目自带的可在 RT-BE86U、RT-AC86U 上运行）：
    - `bin/sing-box`
    - `bin/smartdns`
3. 给予执行权限（示例）：

```bash
chmod +x merlin-box.sh
chmod +x start_merlin_box.sh
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

### 3. 如需额外直连 IP，可创建并维护 (可选)：

- `res/ip4-whitelist.txt`
- `res/ip6-whitelist.txt`

### 4. 广告拦击/屏蔽域名 (黑洞)

- `res/site-blocklist.txt`

### 5. 强制走代理域名 (黑名单)

- `res/site-blacklist.txt` 本项目此文件中收集了 Apple 相关域名，能解决访问外区苹果服务的很多问题，访问国区的小伙伴自行修改此文件。

### 6. 设备黑白名单 (可选)

- `res/device_blacklist.txt`：怕邻居蹭网误入迷失深林🌳，在此文件中配置邻居设备的 MAC 地址即可。
- `res/device_whitelist.txt`：使用白名单可以防止未授权的来宾用户误入迷失深林🌳，在此文件中配置常用设备 MAC 地址即可。
- ⚠️如果不需要此功能，请删除对应的文件，否则有可能因为文件存在，但没有配设备，导致设备无法上网。

---

## ▶️ 启停命令

主入口命令：

```bash
./merlin-box.sh start                      #启动服务
./merlin-box.sh stop                       #停止服务
./merlin-box.sh restart                    #重启服务
./merlin-box.sh -h                         #显示帮助信息
./merlin-box.sh -v                         #显示版本信息
```

- ▶️`start`：清理旧规则 -> 启动 sing-box -> 启动 smartdns -> 重启 dnsmasq
- ⏹️ `stop`：停止 sing-box/smartdns -> 清理 iptables/ip6tables/ip rule/ipset -> 重启 dnsmasq

安装与卸载（开机启动）：

```bash
./merlin-box.sh install                     #安装服务使其开机启动（拨号成功后）
./merlin-box.sh uninstall                   #卸载服务禁用开机启动
```

工具命令：

```bash
./merlin-box.sh tool compress_singbox       #压缩 sing-box 可执行文件 ¹
./merlin-box.sh tool compress_smartdns      #压缩 smartdns 可执行文件 ¹
./merlin-box.sh tool show_devices           #显示当前 DHCP 租约的设备列表 
./merlin-box.sh tool update_rules           #更新规则文件 ²
./merlin-box.sh tool build_singbox          #构建 sing-box 可执行文件 ¹
./merlin-box.sh tool -h
```

1. 命令仅在本地系统（或WSL）中执行，不能在路由器上执行。压缩依赖 upx 工具。
- 本仓库携带的二进制文件已经经过压缩。
- ⚠️压缩虽然可以明显降低文件大小，但是启动时会比原始程序要慢。
2. 规则更新有两种行为：
- 在开发模式下，会调用python脚本从三个源下载最新规则文件并覆盖本地文件。
- 在生产模式下（路由器中），使用wget从本仓库的 raw 文件下载最新规则文件并覆盖本地文件。

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
