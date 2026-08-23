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
 * NaiveForm
 * https://sing-box.sagernet.org/zh/configuration/outbound/naive/
 *
 * {
 *   "type": "naive",
 *   "tag": "naive-out",                //这个东西添加的时候自动生成一个uuid
 *
 *   "server": "127.0.0.1",            //普通 input  必须输入  ip4或ip6, 注意这里不能填写域名.
 *   "server_name" : "example.com",        //普通 input  必须输入 域名.   这个不是标准属性, 最终会填入 tls.server_name
 *   "server_port": 443,               //普通 input 只能输入数字  1->65535
 *   "username": "sekai",              //普通 input  必须输入
 *   "password": "password",           //普通 input  必须输入
 *   "insecure_concurrency": 0,        //不实现
 *   "extra_headers": {},              //不实现
 *   "udp_over_tcp": false | {},       //antd.Switch 默认false
 *   "quic": false,                    //antd.Switch 默认false
 *   "quic_congestion_control": "",    //antd.Select 默认 bbr
 *   "tls": {},                        //不实现管理,  由 server_name 决定       "tls": { "enabled": true, "server_name": "xxx.xxx.net"}
 *
 *   ... // 拨号字段
 * }
 *
 *
 * QUIC 拥塞控制算法。
 *
 * 算法	描述
 * bbr	BBR
 * bbr2	BBRv2
 * cubic	CUBIC
 * reno	New Reno
 *
 */
class NaiveForm extends React.Component {

    // quic 拥塞控制算法选项
    #quicCongestionControlOptions = [
        {
            label: "BBR",
            value: "bbr"
        },
        {
            label: "BBRv2",
            value: "bbr2"
        },
        {
            label: "CUBIC",
            value: "cubic"
        },
        {
            label: "New Reno",
            value: "reno"
        }
    ]

    // 唯一的ID
    #uuid = ""

    /**
     * 构造方法
     * @param props
     */
    constructor(props) {
        super(props);
        if (props.onRef) {
            try {
                props.onRef(this);
            } catch (e) {
                console.error("NaiveForm onRef error:", e);
            }
        }
        this.#uuid = this.$helper.getUUid();
        this.state = {
            name: "", // 节点名称
            server: "", // 服务器地址，仅支持 IPv4 / IPv6
            serverName: "", // TLS Server Name
            serverPort: "", // 端口
            username: "", // 用户名
            password: "", // 密码
            udpOverTcp: false, // UDP over TCP
            quic: false, // QUIC
            quicCongestionControl: "bbr", // QUIC 拥塞控制
            nameError: false,
            serverError: false,
            serverNameError: false,
            serverPortError: false,
            usernameError: false,
            passwordError: false,
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
     * @param state 表单状态
     * @returns {object} 表单值
     */
    #buildValue(state) {
        const value = {
            tag: this.#uuid,
            is_default: false,
            type: "naive",
            name: state.name.trim(),
            server: state.server.trim(),
            server_port: Number(state.serverPort),
            username: state.username.trim(),
            password: state.password,
            udp_over_tcp: state.udpOverTcp,
            quic: state.quic,
            tls: {
                enabled: true,
                server_name: state.serverName.trim(),
            }
        };
        if (state.quic) {
            value.quic_congestion_control = state.quicCongestionControl;
        }
        return value;
    }

    /**
     * 验证表单
     * @returns {boolean} 验证结果
     */
    #validate() {
        const {name, server, serverName, serverPort, username, password} = this.state;
        const nameError = !name || !name.trim();
        const serverError = !server || !(server.trim().isIPv4() || server.trim().isIPv6());
        const serverNameError = !serverName || !serverName.trim().isDomain();
        const serverPortError = !serverPort || !serverPort.isPort();
        const usernameError = !username || !username.trim();
        const passwordError = !password || !password.trim();

        this.setState({
            nameError,
            serverError,
            serverNameError,
            serverPortError,
            usernameError,
            passwordError,
        });
        return !nameError && !serverError && !serverNameError && !serverPortError && !usernameError && !passwordError;
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
                </div>
            </div>
            <div className="form-item">
                <label>用户名</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.usernameError ? "error" : ""}`}>
                        <input type="text" placeholder="请输入用户名" value={this.state.username} onChange={(e) => {
                            this.state.username = e.target.value;
                            this.setState({
                                username: this.state.username
                            });
                            this.#validate();
                        }}/>
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>密码</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.passwordError ? "error" : ""}`}>
                        <input type="text" placeholder="请输入密码" value={this.state.password} onChange={(e) => {
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
                <label>UDP over TCP</label>
                <div className="form-field">
                    <div className="nlc-empty">
                        <antd.Switch
                            checked={this.state.udpOverTcp}
                            onChange={(val) => {
                                this.state.udpOverTcp = val;
                                this.setState({udpOverTcp: this.state.udpOverTcp});
                                this.#validate();
                            }}
                        />
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>QUIC</label>
                <div className="form-field">
                    <div className="nlc-empty">
                        <antd.Switch
                            checked={this.state.quic}
                            onChange={(val) => {
                                this.state.quic = val;
                                this.setState({quic: this.state.quic});
                                this.#validate();
                            }}
                        />
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>QUIC 拥塞控制</label>
                <div className="form-field">
                    <antd.Select
                        value={this.state.quicCongestionControl}
                        style={{width: "100%"}}
                        disabled={!this.state.quic}
                        onChange={(val) => {
                            this.state.quicCongestionControl = val;
                            this.setState({quicCongestionControl: this.state.quicCongestionControl});
                            this.#validate();
                        }}
                        options={this.#quicCongestionControlOptions}
                    />
                </div>
            </div>
        </div>
    }
}

export default NaiveForm
