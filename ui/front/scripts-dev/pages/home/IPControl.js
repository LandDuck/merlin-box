/*
 * # merlin-box - A sing-box + smartdns routing and proxy script solution for ASUSWRT-Merlin routers.
 * # Copyright (C) 2026 LandDuck <https://github.com/LandDuck/>
 * #
 * # This program is free software: you can redistribute it and/or modify
 * # it under the terms of the GNU General Public License as published by
 * # the Free Software Foundation, either version 3 of the License, or
 * # (at your option) any later version.
 * #
 * # This program is distributed in the hope that it will be useful,
 * # but WITHOUT ANY WARRANTY; without even the implied warranty of
 * # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * # GNU General Public License for more details.
 * #
 * # You should have received a copy of the GNU General Public License
 * # along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const IPv4RegExp = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})$/;

function isValidIPv4(ipAddress) {
    return IPv4RegExp.test(ipAddress);
}

function isValidIPv6(ipAddress) {
    const normalized = ipAddress.trim();
    if (normalized === "" || normalized === "::") {
        return true;
    }
    if (normalized.includes("%")) {
        return false;
    }
    if (/:{3,}/.test(normalized)) {
        return false;
    }
    if (normalized.includes(".")) {
        const lastColonIndex = normalized.lastIndexOf(":");
        if (lastColonIndex < 0) {
            return false;
        }
        const left = normalized.substring(0, lastColonIndex);
        const right = normalized.substring(lastColonIndex + 1);
        if (!isValidIPv4(right)) {
            return false;
        }
        const parts = left.split(":").filter(Boolean);
        if (parts.length === 0 || parts.length > 6) {
            return false;
        }
        return parts.every((part) => /^[0-9A-Fa-f]{1,4}$/.test(part));
    }

    if (normalized.includes("::")) {
        const parts = normalized.split("::");
        if (parts.length > 2) {
            return false;
        }
        const left = parts[0] ? parts[0].split(":").filter(Boolean) : [];
        const right = parts[1] ? parts[1].split(":").filter(Boolean) : [];
        if (left.length + right.length > 7) {
            return false;
        }
        return [...left, ...right].every((part) => /^[0-9A-Fa-f]{1,4}$/.test(part));
    }

    const parts = normalized.split(":");
    if (parts.length !== 8) {
        return false;
    }

    return parts.every((part) => /^[0-9A-Fa-f]{1,4}$/.test(part));
}

function isValidIPAddress(ipAddress, ipVersion) {
    if (!ipAddress || ipAddress.trim() === "") {
        return false;
    }
    if (ipVersion === "ipv4") {
        return isValidIPv4(ipAddress);
    }
    return isValidIPv6(ipAddress);
}

/**
 * IPControl
 */
class IPControl extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            whitelistError: false,
            blacklistError: false,
            whitelist: "",
            blacklist: ""
        };
    }

    #check() {
        const checkIpList = (ipText, version) => {
            const lines = ipText.split(/\r?\n/);
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine === "" || trimmedLine.startsWith("#")) {
                    continue;
                }
                const commentIndex = trimmedLine.indexOf("#");
                const ipAddress = (commentIndex >= 0 ? trimmedLine.substring(0, commentIndex) : trimmedLine).trim();
                if (ipAddress === "") {
                    continue;
                }
                if (!isValidIPAddress(ipAddress, version)) {
                    return false;
                }
            }
            return true;
        };

        this.state.whitelistError = !checkIpList(this.state.whitelist, this.props.version);
        this.state.blacklistError = !checkIpList(this.state.blacklist, this.props.version);
        this.setState({
            whitelistError: this.state.whitelistError,
            blacklistError: this.state.blacklistError
        });
        if (this.state.whitelistError || this.state.blacklistError) {
            return false;
        }
        return true;
    }

    #load() {
        this.$http.sendPost({
            url: this.props.getConfigApi,
            success: (data) => {
                this.setState({
                    whitelist: data.whitelist || "",
                    blacklist: data.blacklist || ""
                });
            }
        });
    }

    #save() {
        if (!this.#check()) {
            this.$helper.error(`配置中存在无效的 ${this.props.title} 地址，请检查后再保存。`);
            return;
        }

        this.$http.sendPost({
            url: this.props.saveConfigApi,
            data: {
                whitelist: this.state.whitelist,
                blacklist: this.state.blacklist
            },
            success: () => {
                this.$helper.success("配置保存成功，重启服务生效。");
            }
        });
    }

    componentDidMount() {
        this.#load();
    }

    render() {
        const panelName = this.props.title;
        const version = this.props.version === "ipv4" ? "IPv4" : "IPv6";
        return <section className="device-control mb-item">
            <div className="section-title">
                <span className="device-icon"/>
                <h2>{panelName}</h2>
            </div>
            <div className="device-hint">
                <div>🚀 白名单 IP 会强制直连，不经过代理；⛔ 黑名单 IP 会强制走代理，且黑名单优先。</div>
                <div>📝 支持使用 # 注释，允许空行；每行一个 IP，也可在 IP 后追加 # 注释。</div>
            </div>
            <div className="device-config">
                <div className="device-group">
                    <label>
                        {version} 白名单 (IP 地址)
                    </label>
                    <textarea
                        className={`device-editor ${this.state.whitelistError ? "error" : ""}`}
                        placeholder={this.props.version === "ipv4" ? "192.168.1.10\n10.0.0.1" : "2001:4860:4860::8888\n::1"}
                        value={this.state.whitelist}
                        onChange={(e) => {
                            this.state.whitelist = e.target.value;
                            this.setState({
                                whitelist: this.state.whitelist
                            });
                            this.#check();
                        }}
                    />
                </div>
                <div className="device-group">
                    <label>
                        {version} 黑名单 (IP 地址)
                    </label>
                    <textarea
                        className={`device-editor ${this.state.blacklistError ? "error" : ""}`}
                        placeholder={this.props.version === "ipv4" ? "8.8.8.8\n1.1.1.1" : "2001:4860:4860::8888\n2606:4700:4700::1111"}
                        value={this.state.blacklist}
                        onChange={(e) => {
                            this.state.blacklist = e.target.value;
                            this.setState({
                                blacklist: this.state.blacklist
                            });
                            this.#check();
                        }}
                    />
                </div>
            </div>
            <div className="device-footer">
                <button className="save-button" onClick={() => {
                    this.#save();
                }}>
                    保存配置
                </button>
            </div>
        </section>
    }
}

export default IPControl
