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


/**
 * DeviceControl
 */
class DeviceControl extends React.Component {

    /**
     * 构造方法
     * @param props
     */
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
        //规则:
        //1. 可以有 #开头
        //2. 可以有空行
        //3. 每行是一个MAC地址, 后面也可以 #注释
        const macRegExp = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
        const checkMacList = (macText) => {
            const lines = macText.split(/\r?\n/);
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine === "" || trimmedLine.startsWith("#")) {
                    continue;
                }
                const commentIndex = trimmedLine.indexOf("#");
                const macAddress = (commentIndex >= 0 ? trimmedLine.substring(0, commentIndex) : trimmedLine).trim();
                if (macAddress === "") {
                    continue;
                }
                if (!macRegExp.test(macAddress)) {
                    return false;
                }
            }
            return true;
        };
        this.state.whitelistError = !checkMacList(this.state.whitelist);
        this.state.blacklistError = !checkMacList(this.state.blacklist);
        this.setState({
            whitelistError: this.state.whitelistError,
            blacklistError: this.state.blacklistError
        });
        if (this.state.whitelistError || this.state.blacklistError) {
            return false;
        }
        return true;
    }

    /**
     * 加载数据
     */
    #load() {
        this.$http.sendPost({
            url: this.$config.apis.comm_getDeviceControlConfig,
            success: (data) => {
                this.setState({
                    whitelist: data.whitelist || "",
                    blacklist: data.blacklist || ""
                });
            }
        });
    }

    /**
     * 保存配置
     */
    #save() {
        if (!this.#check()) {
            this.$helper.error("配置中存在无效的MAC地址，请检查后再保存。");
            return;
        }

        this.$http.sendPost({
            url: this.$config.apis.comm_saveDeviceControlConfig,
            data: {
                whitelist: this.state.whitelist,
                blacklist: this.state.blacklist
            },
            success: () => {
                this.$helper.success("配置保存成功，重启服务生效。");
            }
        });
    }

    /**
     * 显示DHCP客户端列表
     */
    #showDhcpClientList() {
        this.$http.sendPost({
            url: this.$config.apis.comm_showDhcpClientList,
            success: (data) => {
                const content = (data || "")
                    .replace(/\x1b\[[0-9;]*m/g, "")
                    .replace(/\r\n|\r|\n/g, "<br/>");
                this.$helper.showLogLayer({
                    title: "DHCP客户端列表",
                    okText: "关闭",
                    content: content
                });
            }
        });
    }

    /**
     * 第一次挂载后
     */
    componentDidMount() {
        this.#load();
    }

    /**
     * 组件卸载
     */
    componentWillUnmount() {

    }


    /**
     * 渲染方法
     * @return
     */
    render() {
        return <section className="device-control  mb-item">
            <div className="section-title">
                <span className="device-icon"/>
                <h2>设备控制</h2>
            </div>
            <div className="device-hint">
                <ol>
                    <li>🚀 配置白名单设备后，只有白名单设备可以走代理；⛔ 黑名单设备无论如何都不走代理，且黑名单优先。</li>
                    <li>📝 支持使用 # 注释，允许空行；每行一个 MAC 地址，也可在 MAC 后追加 # 注释。</li>
                    <li>⚠️ 只要白名单中有内容，就会启用白名单功能，此时如果里面没有有效MAC地址，会导致所有设备都不会走代理。</li>
                </ol>
            </div>
            <div className="device-config">
                <div className="device-group">
                    <label>
                        设备白名单 (MAC 地址)
                    </label>
                    <textarea
                        className={`device-editor ${this.state.whitelistError ? "error" : ""}`}
                        placeholder={"00:1A:2B:3C:4D:5E\nAA:BB:CC:DD:EE:FF"}
                        value={this.state.whitelist}
                        onChange={(e) => {
                            this.state.whitelist = e.target.value;
                            this.setState({
                                whitelist: this.state.whitelist
                            })
                            this.#check();
                        }}
                    />
                </div>
                <div className="device-group">
                    <label>
                        设备黑名单 (MAC 地址)
                    </label>
                    <textarea
                        className={`device-editor ${this.state.blacklistError ? "error" : ""}`}
                        placeholder={"6E:D5:43:21:0A:9B"}
                        value={this.state.blacklist}
                        onChange={(e) => {
                            this.state.blacklist = e.target.value;
                            this.setState({
                                blacklist: this.state.blacklist
                            })
                            this.#check();
                        }}
                    />
                </div>
            </div>
            <div className="device-footer">
                <button className="save-button" onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.#showDhcpClientList();
                }}>
                    显示DHCP客户端列表
                </button>
                <button className="save-button" onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // 保存配置逻辑
                    this.#save();
                }}>
                    保存配置
                </button>
            </div>
        </section>
    }
}

export default DeviceControl
