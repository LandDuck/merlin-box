# 🚀 merlin-box

#### 🌐 Languages

- English
- [简体中文](README.zh-CN.md)


A **sing-box + smartdns** routing and proxy script solution based on the **ASUSWRT-Merlin** router environment.

This project aims to clearly separate responsibilities:

- 🛰️ sing-box is only responsible for proxy forwarding
- 🌐 smartdns is responsible for DNS resolution and domain routing
- 📦 ipset + iptables/ip6tables is responsible for IP routing and transparent proxy forwarding

#### 🎥 Quick Start Tutorial

> 💡 **Click the thumbnail below to watch the video demonstration:**

[![Video Tutorial](https://img.youtube.com/vi/0-dqQMX74sE/default.jpg)](https://www.youtube.com/watch?v=0-dqQMX74sE&list=PLDyvs8NWsF2w)

---

# 📋 Current Features and Limitations

<table>
  <thead>
    <tr>
      <th width="180">Item</th>
      <th width="160">Status</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>IPv4 / IPv6</td>
      <td>✅ Supported</td>
      <td>
        Automatically detects IPv6 on startup; enables it if available, automatically downgrades to IPv4 if not available.<br>
        You can manually disable IPv6 by modifying the MB_ENABLE_IPV6 variable in merlin-box.sh.
      </td>
    </tr>
    <tr>
      <td>IPv4 / IPv6 Routing</td>
      <td>✅ Supported</td>
      <td>
        ipset + iptables/ip6tables
      </td>
    </tr>
    <tr>
      <td>Block LAN-side QUIC <br />UDP 443</td>
      <td>✅ Handled</td>
      <td>
        Blocks by default (DROP UDP 443) to prevent UDP direct connection leaks.<br>
        You can disable this by modifying the MB_DISABLE_QUIC_FROM_LAN variable in merlin-box.sh.
      </td>
    </tr>
    <tr>
      <td>smartdns Resolution Routing</td>
      <td>✅ Supported</td>
      <td>
        smartdns replaces dnsmasq to handle DNS resolution and domain routing.
      </td>
    </tr>
    <tr>
      <td>Ad Blocking</td>
      <td>✅ Supported</td>
      <td>
        Implemented through configuring the site-blocklist.txt blackhole domain list.
      </td>
    </tr>
    <tr>
      <td>Domain Blacklist</td>
      <td>✅ Supported</td>
      <td>
        Implemented through configuring the site-blacklist.txt blacklist domain list to force specified domains through the proxy.
      </td>
    </tr>
    <tr>
      <td>Domain Whitelist</td>
      <td>✅ Supported</td>
      <td>
        Implemented through configuring the site-whitelist.txt whitelist domain list to force specified domains to direct connection.
      </td>
    </tr>
    <tr>
      <td>Custom HOSTS</td>
      <td>✅ Supported</td>
      <td>
        Implemented through configuring the hosts.txt file for custom HOSTS, commonly used by developers to resolve domain names within the local network for debugging.
      </td>
    </tr>
    <tr>
      <td>IP Whitelist</td>
      <td>✅ Supported</td>
      <td>
        Implemented through configuring ip4-whitelist.txt and ip6-whitelist.txt files to force specified IPs to direct connection.
      </td>
    </tr>
    <tr>
      <td>IP Blacklist</td>
      <td>✅ Supported</td>
      <td>
        Implemented through configuring ip4-blacklist.txt and ip6-blacklist.txt files to force specified IPs through the proxy.
      </td>
    </tr>
    <tr>
      <td>UDP</td>
      <td>✅ Supported</td>
      <td>
        UDP is disabled by default. To use UDP proxy, change the MB_ENABLE_UDP variable value in merlin-box.sh to 1.
      </td>
    </tr>
    <tr>
      <td>Router Itself</td>
      <td>✅ Supported</td>
      <td>
        TCP proxy only, disabled by default. To enable, change the MB_ENABLE_ONESELF_PROXY variable value in merlin-box.sh to 1.
      </td>
    </tr>
    <tr>
      <td>Device Blacklist</td>
      <td>✅ Supported</td>
      <td>
        Prevents neighbors from accidentally entering the <b>Lost Forest🌳</b>. Configure neighbors' device MAC addresses in device_blacklist.txt.
      </td>
    </tr>
    <tr>
      <td>Device Whitelist</td>
      <td>✅ Supported</td>
      <td>
        Using a whitelist prevents unauthorized guests from accidentally entering the <b>Lost Forest🌳</b>. Configure common device MAC addresses in device_whitelist.txt.
      </td>
    </tr>
    <tr>
      <td>UI</td>
      <td>✅ Supported</td>
      <td>
        WEB UI is started using ./merlin-box.sh server.
      </td>
    </tr>
    <tr>
      <td>Ping Proxy</td>
      <td>⏳ Not Supported</td>
      <td>
        Not in the current proxy scope.
      </td>
    </tr>
  </tbody>
</table>

### 💡 Notes

- UDP proxy requires support from upstream nodes, and sing-box needs to be configured with an outbound that supports UDP.
- Proxy functionality for the router itself requires adding a redirect inbound in the sing-box configuration.
- IPv6 requires both local network and upstream server support; when MB_ENABLE_IPV6=1, the script will automatically detect local network IPv6 availability and automatically downgrade to IPv4 if unavailable.
- ⚠️ The script cannot detect whether the upstream server supports IPv6. If the upstream does not support IPv6 and MB_ENABLE_IPV6=1, since IPv6 priority mode will be used, you may not be able to connect to the internet.
- QUIC is part of UDP. Regardless of whether UDP proxy is enabled, the project adopts an interception scheme (DROP UDP 443), which means websites that rely on H3/QUIC will not be able to access via QUIC on the client side (usually falls back to TCP/TLS; some sites may fail to open or behave abnormally).
- ⚠️ Device blacklist and whitelist functionality depends on whether device_blacklist.txt/device_whitelist.txt files exist. As long as the files exist, the script will enable the blacklist/whitelist functionality. If you do not need this feature, please delete these two files.
- WEB UI is started using ./merlin-box.sh server, with the default port being 8080. You can specify a port when starting: ./merlin-box.sh server 8081. The default login username/password is admin/merlinbox.
---

# ⚙️ Core Execution Logic

## 🌍 Domain Routing (smartdns)

- `res/chn-site.txt` serves as the domain collection
- Matching domain -> Use China DNS upstream for resolution (`china` group)
- Other domains -> Use international DNS upstream (`foreign` group, proxied through socks5 by default)

smartdns configuration:

- Configuration file: `conf/smartdns.conf`
- Configuration reference: https://pymumu.github.io/smartdns/en/configuration/

---

## 📡 IP Routing (ipset + iptables/ip6tables)

- `res/chn-ip4.txt`, `res/chn-ip6.txt` serve as the IP subnet collection
- Loaded into ipset collections on startup:
    - IPv4: `merlinkbox_chn`
    - IPv6: `merlinkbox_chn_v6`
- Matching IP collection -> Direct connection pass-through
- Non-matching -> Transparent proxy forwarding to sing-box TPROXY port

Optional whitelist files:

- IPs in these whitelists will be treated as direct connections:
    - `res/ip4-whitelist.txt`
    - `res/ip6-whitelist.txt`

---

## 🚀 Proxy Execution (sing-box)

- Inbound:
    - SOCKS: `65001` (for smartdns foreign upstream to resolve through proxy)
    - TPROXY: `65002` (for transparent proxy receiving)
- Outbound: Configure yourself in `conf/config.json`

sing-box (conf/config.json) configuration reference:

- https://sing-box.sagernet.org/configuration/

---

# 📁 Directory Structure

```text
merlin-box/
├─ merlin-box.sh            # Main entry script (start/stop)
├─ start_merlin_box.sh      # For boot startup support
├─ ui/                      # WEB UI Development Directory
│  ├─ server                # WEB UI server
│  └─ front                 # WEB UI front-end
├─ wwwroot/                 # WEB UI static files
├─ db/                      # WEB UI database
│  └─ db.json               # WEB UI database file, note to change the login username and password after first obtaining it, the password is an md5 encrypted string
├─ bin/
│  ├─ sing-box              # sing-box executable
│  ├─ smartdns              # smartdns executable
│  └─ merlin-box             # WEB UI server executable
├─ conf/
│  ├─ config.json           # sing-box configuration
│  └─ smartdns.conf         # smartdns configuration
├─ scripts/
│  └─ dnsmasq.postconf      # dnsmasq post-processing script (used when taking over port 53)
├─ sh/
│  ├─ fun.sh                # Core logic
│  └─ tool.sh               # Implementation of tool subcommands
├─ tools/
│  ├─ sub2box/              # Tool for converting subscriptions to sing-box configuration
│  └─ update-rules/         # Rule update scripts
└─ res/
   ├─ chn-ip4.txt           # China IPv4
   ├─ chn-ip6.txt           # China IPv6
   ├─ chn-site.txt          # China domain list
   ├─ device_blacklist.txt  # Device blacklist (devices cannot use proxy)
   ├─ device_whitelist.txt  # Device whitelist (only authorized devices can use proxy)
   ├─ site-blocklist.txt    # Blocked domain list (blackhole)
   └─ site-blacklist.txt    # Blacklist domain list (force proxy)
```

### ⚠️ Notes

- The script will by default look for `bin/sing-box` and `bin/smartdns` in the project to start related services and redirect console output to `logs/sing-box.log` and `logs/smartdns.log`.
- The binary files included have been tested on the following devices (limited devices available for testing).

| Model    | SINGBOX          | SMARTDNS         |
|----------|------------------|------------------|
| RT-BE86U | linux-arm64-musl | smartdns-aarch64 |
| RT-AC86U | linux-arm64-musl | smartdns-aarch64 |

---

# 🖥️ Applicable Environments and Device Notes

- ✅ Tested Models: RT-BE86U, RT-AC86U.
- ✅ Architecture Support: Pre-built packages are provided for ARM64 (64-bit) and ARM (32-bit). Download the appropriate package from the Release page.
- ⏳ More Models: Due to limited access to hardware, additional models have not yet been tested. In theory, any ASUSWRT-Merlin router with an ARM64 or ARM (32-bit) CPU architecture should be able to run Merlin-box. If you encounter any issues, please report them in Issues.
- 💾 Storage: Some routers have limited JFFS storage. Although the binary has been compressed, you may still run out of space. It is recommended to place the program on a USB drive or other external storage.
- 📂 Installation Directory: Merlin-box can run from any directory, but /jffs/merlin-box is recommended.

---

# 🚀 Quick Deployment

## 📦 Prepare Files

1. Download the package matching your router's CPU architecture from the Release page, then upload the project files to your router. It is recommended to place them in /jffs/merlin-box.
2. Optional: This project provides ARM64 (64-bit) and ARM (32-bit) versions. If the included binaries are not compatible with your router's CPU architecture, you can try downloading the appropriate binaries from the sing-box and SmartDNS repositories and replacing the corresponding files in the project.
    - `bin/sing-box`
    - `bin/smartdns`
3. Grant execute permissions (example):

```bash
chmod +x merlin-box.sh
chmod +x start_merlin_box.sh
chmod +x bin/sing-box
chmod +x bin/smartdns
chmod +x bin/merlin-box
chmod +x scripts/dnsmasq.postconf
```

---

## ▶️Start UI and Initialize Configuration (WEB UI)

1. **Start the WEB UI Server**

   ```bash
   ./merlin-box.sh server
   ```

2. **Access the WEB UI**

   Open the following address in your browser:

   `http://ROUTER_IP:8080`

3. **Log in to the WEB UI**

   Use the default credentials:

  * Username: `admin`
  * Password: `merlinbox`

4. **Configure Proxy Nodes**

   Go to **Node Management**, add your proxy nodes, and set the node you want to use as the **default node**.

5. **Configure Other Settings**

   Adjust the following settings according to your needs:

  * DNS upstream servers
  * IP whitelist / blacklist
  * Domain blacklist
  * Other routing and proxy settings

6. **Start the Proxy**

   Once the configuration is complete, start the proxy service.


---

## 🔧 Modify Configuration (Script Mode Manual)

### 1. Modify `conf/config.json` (sing-box configuration)

- Configure outbounds based on your node information
- Confirm that the sing-box outbound `routing_mark` matches the script variable (default `169`)

### 2. Modify `conf/smartdns.conf`

- Replace China/International DNS upstream as needed
- Maintain domain routing rules (`chn-site.txt`)

### 3. If you need additional direct connection IPs, you can create and maintain (optional):

- `res/ip4-whitelist.txt`
- `res/ip6-whitelist.txt`

### 4. If you need to force proxy for specific IPs, you can create and maintain (optional):

- `res/ip4-blacklist.txt`
- `res/ip6-blacklist.txt`

### 5. Ad blocking/domain blocking (blackhole)

- `res/site-blocklist.txt`

### 6. Force proxy domain (blacklist)

- `res/site-blacklist.txt` This project includes Apple-related domains in this file, which helps solve many problems accessing foreign Apple services. Friends accessing China region should modify this file themselves.

### 7. Device blacklist and whitelist (optional)

- `res/device_blacklist.txt`: Worried about neighbors leeching and accidentally entering the Lost Forest🌳? Configure neighbors' device MAC addresses in this file.
- `res/device_whitelist.txt`: Using a whitelist can prevent unauthorized guests from accidentally entering the Lost Forest🌳. Configure common device MAC addresses in this file.
- ⚠️ If you don't need this feature, please delete the corresponding file; otherwise, the file may exist but have no configured devices, causing devices to fail to connect to the internet.

---

## ▶️ Start/Stop Commands

Main entry command:

```bash
./merlin-box.sh start                      #Start service (defaults: 1 1 0 0 1)
./merlin-box.sh start 1 1 0 0 1            #Start with explicit params: IPv6 QUIC-block UDP oneself-proxy TcpFastOpen
./merlin-box.sh stop                       #Stop service
./merlin-box.sh restart                    #Restart service
./merlin-box.sh restart 1 1 0 0 1          #Restart with explicit params: IPv6 QUIC-block UDP oneself-proxy TcpFastOpen
./merlin-box.sh server                     #Start WEB UI server, default port is 8080, can specify port on startup: ./merlin-box.sh server 8081. Supports subcommands start/stop/restart, default is start. ./merlin-box.sh server start 8081
./merlin-box.sh -h                         #Show help information
./merlin-box.sh -v                         #Show version information
```

- ▶️ `start`: Clean old rules -> Start sing-box -> Start smartdns -> Restart dnsmasq
- `start` parameters (all optional, each value is `0` or `1`, default is `1 1 0 0 1`):
  - `enable_ipv6` `disable_quic_from_lan` `enable_udp` `enable_oneself_proxy` `enable_tcp_fast_open`
- ⏹️ `stop`: Stop sing-box/smartdns -> Clean iptables/ip6tables/ip rule/ipset -> Restart dnsmasq

Installation and uninstallation (boot startup):

```bash
./merlin-box.sh install                     #Install service to enable boot startup (after successful connection)
./merlin-box.sh uninstall                   #Uninstall service to disable boot startup
```

Tool commands:

```bash
./merlin-box.sh tool compress_singbox       #Compress sing-box executable ¹
./merlin-box.sh tool compress_smartdns      #Compress smartdns executable ¹
./merlin-box.sh tool show_devices           #Show current DHCP lease device list  
./merlin-box.sh tool update_rules           #Update rule files ²
./merlin-box.sh tool build_singbox          #Build sing-box executable ¹
./merlin-box.sh tool download_smartdns      #Download smartdns executable ¹
./merlin-box.sh tool sub2box                #Convert subscription to sing-box configuration ³
./merlin-box.sh tool -h
```

1. Commands are only executed on the local system (or WSL), not on the router. Compression depends on the upx tool.
- The binary files included in this repository have been compressed.
- ⚠️ While compression can significantly reduce file size, startup will be slower than the original program.

2. Rule updates have two behaviors:
- In development mode, a Python script is called to download the latest rule files from three sources and overwrite the local files.
- In production mode (on the router), wget is used to download the latest rule files from the raw files of this repository and overwrite the local files.

3. Subscription conversion has two behaviors:
- In development mode, a Python script is called to convert the subscription to sing-box configuration.
- In production mode (on the router), the merlin-box (under development) binary file is called for conversion.

---

# 📡 Protocol Support

In theory, any protocol supported by sing-box can be integrated into this solution as long as it is correctly configured in `conf/config.json`.

---

# 🙏 Reference Projects

- sing-box  
  https://github.com/sagernet/sing-box

- smartdns  
  https://github.com/pymumu/smartdns

- fancyss  
  https://github.com/hq450/fancyss

---

# 📜 LICENSE

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

Copyright (C) 2026 [LandDuck](https://github.com/LandDuck/).
