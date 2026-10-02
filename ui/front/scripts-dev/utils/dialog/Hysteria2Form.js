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

import React from "react";

/**
 * Hysteria2Form
 * {
 *   "type": "hysteria2",
 *   "tag": "hy2-out",  //这个东西添加的时候自动生成一个uuid
 *
 *   "server": "127.0.0.1",                 //普通 input  必须输入  ip4或ip6, 注意这里不能填写域名.
 *   "server_name" : "example.com",        //普通 input  必须输入 域名.   这个不是标准属性, 最终会填入 tls.server_name
 *   "server_port": 1080,                 //普通 input 只能输入数字  1->65535
 *
 *   "enable_hop": 0,                    //antd select, 端口跳跃(enable_hop), 开启（1）/关闭（0）。默认是关闭的。 2026-10-3 03:18:53 实现.
 *   "server_ports": [
 *       "2080:3000",
 *       "4000:5000"
 *   ],                                  //普通 input 2026-10-3 03:18:04 实现 端口范围，格式为 ‘1000:2000,3000:4000’  逗号分隔多组，每组必须是端口范围
 *   "hop_interval": "",                 //普通 input 只能输入数字  2026年10月3日03:18:08 实现  跳跃间隔，单位为秒， 默认30
 *
 *   "hop_interval_max": "",             //不实现
 *   "up_mbps": 100,                     //普通 input 只能输入数字  10->10000  注意单位
 *   "down_mbps": 100,                   //普通 input 只能输入数字  10->10000  注意单位
 *   "obfs": {
 *     "type": "salamander",            //antd select 选择框  可选值: "salamander" "gecko"
 *     "password": "cry_me_a_r1ver"     //普通 input  必须输入  字符串
 *   },
 *   "password": "goofy_ahh_password",  //普通 input  必须输入  字符串
 *   "network": "tcp",                  //tcp or udp, default all  //使用antd.Select  ALL=""/TCP="tcp"/UDP="udp"
 *   "tls": {},                          //不实现管理,  由 server_name 决定        "tls": {"enabled": true,"server_name": "xxx.xxx.net","alpn": ["h3"]}
 *
 *   },
 *
 *   ... // 拨号字段
 * }
 */
class Hysteria2Form extends React.Component {

    // 唯一的ID
    #uuid = ""
    //isDefault
    #isDefault = false;

    #networkOptions = [
        {
            label: "ALL",
            value: ""
        },
        {
            label: "TCP",
            value: "tcp"
        },
        {
            label: "UDP",
            value: "udp"
        }
    ]

    #obfsTypeOptions = [
        {
            label: "salamander",
            value: "salamander"
        },
        {
            label: "gecko",
            value: "gecko"
        }
    ]

    constructor(props) {
        super(props);
        if (props.onRef) {
            try {
                props.onRef(this);
            } catch (e) {
                console.error("Hysteria2Form onRef error", e);
            }
        }
        this.#uuid = this.$helper.getUUid();
        this.state = {
            name: "", // 节点名称
            server: "", // 服务器地址，仅支持 IPv4 / IPv6
            serverName: "", // TLS Server Name
            serverPort: "", // 端口
            upMbps: "100", // 上行速率 Mbps
            downMbps: "100", // 下行速率 Mbps
            obfsType: "salamander", // 混淆类型
            obfsPassword: "", // 混淆密码
            password: "", // Hysteria2 密码
            network: "", // 网络协议
            enableHop: 0, // 端口跳跃
            serverPorts: "", // 端口范围，如 1000:2000,3000:4000
            hopInterval: "30", // 跳跃间隔(秒)
            serverPortsError: false,
            hopIntervalError: false,
            nameError: false,
            serverError: false,
            serverNameError: false,
            serverPortError: false,
            upMbpsError: false,
            downMbpsError: false,
            obfsPasswordError: false,
            passwordError: false,
        }
        const editData = (props.config && props.config.data) || null;
        if (editData) {
            this.#uuid = editData.tag || this.#uuid;
            this.#isDefault = editData.is_default || false;
            console.log("Hysteria2Form editData", editData);
            this.state.name = editData.name || "";
            this.state.server = editData.server || "";
            this.state.serverName = (editData.tls && editData.tls.server_name) || "";
            this.state.serverPort = editData.server_port.toString() || "";
            this.state.upMbps = editData.up_mbps === undefined || editData.up_mbps === null ? "100" : String(editData.up_mbps);
            this.state.downMbps = editData.down_mbps === undefined || editData.down_mbps === null ? "100" : String(editData.down_mbps);
            this.state.obfsType = (editData.obfs && editData.obfs.type) || "salamander";
            this.state.obfsPassword = (editData.obfs && editData.obfs.password) || "";
            this.state.password = editData.password || "";
            this.state.network = editData.network || "";
            this.state.enableHop = Number(editData.enable_hop) === 1 ? 1 : 0;
            this.state.serverPorts = editData.server_ports || "";
            this.state.hopInterval = editData.hop_interval ? String(editData.hop_interval) : "30";
        }
    }

    /**
     * 验证表单
     * @returns {boolean} 验证结果
     */
    validate = () => this.#validate();

    /**
     * 获取表单值
     * @returns {object} 表单值
     */
    getValue = () => {
        if (!this.#validate()) {
            return null;
        }
        return this.#buildValue(this.state);
    };

    /**
     * 构建表单值
     * @param state
     * @returns
     */
    #buildValue(state) {
        const value = {
            tag: this.#uuid,
            is_default: this.#isDefault,
            type: "hysteria2",
            name: state.name.trim(),
            server: state.server.trim(),
            server_port: Number(state.serverPort),
            up_mbps: Number(state.upMbps),
            down_mbps: Number(state.downMbps),
            obfs: {
                type: state.obfsType,
                password: state.obfsPassword,
            },
            password: state.password,
            network: state.network,
            tls: {
                enabled: true,
                server_name: state.serverName.trim(),
                alpn: ["h3"]
            }
        };
        if (Number(state.enableHop) === 1) {
            value.enable_hop = 1;
            value.server_ports = state.serverPorts.trim();
            value.hop_interval = Number(state.hopInterval);
        } else {
            value.enable_hop = 0;
        }
        return value;
    }

    /**
     * 验证端口范围，每组必须是 起始:结束，如 1000:2000,3000:4000
     */
    #isPortsValid(value) {
        if (!value || !value.trim()) {
            return false;
        }
        const inRange = (s) => /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= 65535;
        return value.split(",").map(s => s.trim()).every(item => {
            const parts = item.split(":");
            return parts.length === 2 && inRange(parts[0]) && inRange(parts[1]) && Number(parts[0]) <= Number(parts[1]);
        });
    }

    /**
     * 验证 Mbps 值是否有效
     * @param value
     * @returns {boolean}
     */
    #isMbpsValid(value) {
        if (!value || !/^\d+$/.test(value)) {
            return false;
        }
        const speed = Number(value);
        return Number.isInteger(speed) && speed >= 0 && speed <= 10000;
    }

    #validate() {
        const {name, server, serverName, serverPort, upMbps, downMbps, obfsPassword, password, enableHop, serverPorts, hopInterval} = this.state;
        const nameError = !name || !name.trim();
        const serverError = !server || !(server.trim().isIPv4() || server.trim().isIPv6());
        const serverNameError = !serverName || !serverName.trim().isDomain();
        const serverPortError = !serverPort || !serverPort.isPort();
        const upMbpsError = !this.#isMbpsValid(upMbps);
        const downMbpsError = !this.#isMbpsValid(downMbps);
        const obfsPasswordError = !obfsPassword || !obfsPassword.trim();
        const passwordError = !password || !password.trim();

        const hopOn = Number(enableHop) === 1;
        const serverPortsError = hopOn && !this.#isPortsValid(serverPorts);
        const hopIntervalError = hopOn && !(/^\d+$/.test(String(hopInterval)) && Number(hopInterval) >= 1);

        this.setState({
            serverPortsError,
            hopIntervalError,
            nameError,
            serverError,
            serverNameError,
            serverPortError,
            upMbpsError,
            downMbpsError,
            obfsPasswordError,
            passwordError,
        });
        return !serverPortsError && !hopIntervalError && !nameError && !serverError && !serverNameError && !serverPortError && !upMbpsError && !downMbpsError && !obfsPasswordError && !passwordError;
    }

    /**
     * 渲染方法
     * @return
     */
    render() {
        return <div className="add-node-form">
            <div className="form-item">
                <label>节点名称</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.nameError ? "error" : ""}`}>
                        <input type="text" placeholder="节点名称" value={this.state.name} onChange={(e) => {
                            this.state.name = e.target.value;
                            this.setState({
                                name: this.state.name
                            });
                            this.#validate();
                        }}/>
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>服务器</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.serverError ? "error" : ""}`}>
                        <input type="text" placeholder="IPv4或IPv6" value={this.state.server} onChange={(e) => {
                            this.state.server = e.target.value;
                            this.setState({
                                server: this.state.server
                            });
                            this.#validate();
                        }}/>
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>Server Name</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.serverNameError ? "error" : ""}`}>
                        <input type="text" placeholder="TLS域名，如 example.com" value={this.state.serverName} onChange={(e) => {
                            this.state.serverName = e.target.value;
                            this.setState({
                                serverName: this.state.serverName
                            });
                            this.#validate();
                        }}/>
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>端口</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.serverPortError ? "error" : ""}`}>
                        <input type="number" min="1" max="65535" placeholder="1 - 65535" value={this.state.serverPort}
                               onChange={(e) => {
                                   this.state.serverPort = e.target.value;
                                   this.setState({
                                       serverPort: this.state.serverPort
                                   });
                                   this.#validate();
                               }}/>
                    </div>
                    <div className="form-help-tag">
                        开启端口跳跃后, 忽略此值
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>端口跳跃</label>
                <div className="form-field">
                    <antd.Select
                        value={this.state.enableHop}
                        style={{width: "100%"}}
                        onChange={(val) => {
                            this.state.enableHop = val;
                            this.setState({enableHop: val}, () => this.#validate());
                        }}
                        options={[{label: "关闭", value: 0}, {label: "开启", value: 1}]}
                    />
                </div>
            </div>
            {Number(this.state.enableHop) === 1 && <>
                <div className="form-item">
                    <label>跳跃端口</label>
                    <div className="form-field">
                        <div className={`nlc-input ${this.state.serverPortsError ? "error" : ""}`}>
                            <input type="text" placeholder="如 1000:2000,3000:4000，逗号分隔" value={this.state.serverPorts}
                                   onChange={(e) => {
                                       this.state.serverPorts = e.target.value;
                                       this.setState({serverPorts: this.state.serverPorts});
                                       this.#validate();
                                   }}/>
                        </div>
                    </div>
                </div>
                <div className="form-item">
                    <label>跳跃间隔</label>
                    <div className="form-field">
                        <div className={`nlc-input ${this.state.hopIntervalError ? "error" : ""}`}>
                            <input type="number" min="1" placeholder="默认 30" value={this.state.hopInterval}
                                   onChange={(e) => {
                                       this.state.hopInterval = e.target.value;
                                       this.setState({hopInterval: this.state.hopInterval});
                                       this.#validate();
                                   }}/>
                        </div>
                        <div className="form-help-tag">
                            秒
                        </div>
                    </div>
                </div>
            </>}
            <div className="form-item">
                <label>上行带宽</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.upMbpsError ? "error" : ""}`}>
                        <input type="number" min="0" max="10000" placeholder="0 - 10000" value={this.state.upMbps}
                               onChange={(e) => {
                                   this.state.upMbps = e.target.value;
                                   this.setState({
                                       upMbps: this.state.upMbps
                                   });
                                   this.#validate();
                               }}/>
                    </div>
                    <div className="form-help-tag">
                        Mbps
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>下行带宽</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.downMbpsError ? "error" : ""}`}>
                        <input type="number" min="0" max="10000" placeholder="0 - 10000" value={this.state.downMbps}
                               onChange={(e) => {
                                   this.state.downMbps = e.target.value;
                                   this.setState({
                                       downMbps: this.state.downMbps
                                   });
                                   this.#validate();
                               }}/>
                    </div>
                    <div className="form-help-tag">
                        Mbps
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>混淆类型</label>
                <div className="form-field">
                    <antd.Select
                        value={this.state.obfsType}
                        style={{width: "100%"}}
                        onChange={(val) => {
                            this.state.obfsType = val;
                            this.setState({obfsType: this.state.obfsType});
                            this.#validate();
                        }}
                        options={this.#obfsTypeOptions}
                    />
                </div>
            </div>
            <div className="form-item">
                <label>混淆密码</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.obfsPasswordError ? "error" : ""}`}>
                        <input type="password" placeholder="请输入混淆密码" value={this.state.obfsPassword} onChange={(e) => {
                            this.state.obfsPassword = e.target.value;
                            this.setState({
                                obfsPassword: this.state.obfsPassword
                            });
                            this.#validate();
                        }}/>
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>认证密码</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.passwordError ? "error" : ""}`}>
                        <input type="password" placeholder="请输入认证密码" value={this.state.password} onChange={(e) => {
                            this.state.password = e.target.value;
                            this.setState({
                                password: this.state.password
                            });
                            this.#validate();
                        }}/>
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>网络协议</label>
                <div className="form-field">
                    <antd.Select
                        value={this.state.network}
                        style={{width: "100%"}}
                        onChange={(val) => {
                            this.state.network = val;
                            this.setState({network: this.state.network});
                            this.#validate();
                        }}
                        options={this.#networkOptions}
                    />
                </div>
            </div>
        </div>
    }
}

export default Hysteria2Form
