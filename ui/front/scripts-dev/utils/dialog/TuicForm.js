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
 * TuicForm
 * https://sing-box.sagernet.org/zh/configuration/outbound/tuic/
 *
 *  {
 *   "type": "tuic",
 *   "tag": "tuic-out",
 *
 *   "server": "127.0.0.1", //普通 input  必须输入  ip4或ip6或域名
 *   "server_name" : "example.com",        //普通 input   这个不是标准属性, 最终会填入 tls.server_name  必须输入
 *   "server_port": 1080,  //普通 input 只能输入数字  1->65535
 *   "uuid": "2DD61D93-75D8-4DA4-AC0E-6AECE7EAC365",  //普通 input  必须输入  uuid
 *   "password": "hello",        //密码 input  必须输入  uuid
 *   "congestion_control": "cubic", //antd.Select  cubic/new_reno/bbr default=cubic
 *   "udp_relay_mode": "native",   //antd.Select  native/quic default=native
 *   "udp_over_stream": false,   //不实现
 *   "zero_rtt_handshake": false, //不实现
 *   "heartbeat": "10s",   //不实现
 *   "network": "tcp",                 //tcp or udp, default all  //使用antd.Select  ALL=""/TCP="tcp"/UDP="udp"
 *   "tls": {}, //不实现管理,  由 server_name 决定       "tls": { "enabled": true, "server_name": "xxx.xxx.net"}
 *
 *   ... // QUIC 字段   //不实现
 *
 *   ... // 拨号字段  //不实现
 * }
 *
 */
class TuicForm extends React.Component {

    // 唯一的ID
    #uuid = ""

    #networkOptions = [
        {label: "ALL", value: ""},
        {label: "TCP", value: "tcp"},
        {label: "UDP", value: "udp"},
    ]

    #congestionControlOptions = [
        {label: "cubic", value: "cubic"},
        {label: "new_reno", value: "new_reno"},
        {label: "bbr", value: "bbr"},
    ]

    #udpRelayModeOptions = [
        {label: "native", value: "native"},
        {label: "quic", value: "quic"},
    ]

    constructor(props) {
        super(props);
        if (props.onRef) {
            try {
                props.onRef(this);
            } catch (e) {
                console.error("TuicForm onRef error:", e);
            }
        }
        this.#uuid = this.$helper.getUUid();
        this.state = {
            name: "", // 节点名称
            server: "", // 服务器地址，支持 IPv4 / IPv6 / 域名
            serverName: "", // TLS Server Name（必填）
            serverPort: "", // 端口
            uuid: "", // TUIC UUID
            password: "", // 密码
            congestionControl: "cubic", // 拥塞控制算法
            udpRelayMode: "native", // UDP Relay 模式
            network: "", // 网络协议
            nameError: false,
            serverError: false,
            serverNameError: false,
            serverPortError: false,
            uuidError: false,
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
        return {
            tag: this.#uuid,
            is_default: false,
            type: "tuic",
            name: state.name.trim(),
            server: state.server.trim(),
            server_port: Number(state.serverPort),
            uuid: state.uuid.trim(),
            password: state.password,
            congestion_control: state.congestionControl,
            udp_relay_mode: state.udpRelayMode,
            network: state.network,
            tls: {
                enabled: true,
                server_name: state.serverName.trim(),
            }
        };
    }

    /**
     * 验证 UUID 格式是否合法
     * @param value
     * @returns {boolean}
     */
    #isUuidValid(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value?.trim());
    }

    /**
     * 验证表单
     * @returns {boolean} 验证结果
     */
    #validate() {
        const {name, server, serverName, serverPort, uuid, password} = this.state;
        const nameError = !name || !name.trim();
        const serverError = !server || !(server.trim().isIPv4() || server.trim().isIPv6() || server.trim().isDomain());
        const serverNameError = !serverName || !serverName.trim().isDomain();
        const serverPortError = !serverPort || !serverPort.isPort();
        const uuidError = !this.#isUuidValid(uuid);
        const passwordError = !password || !password.trim();

        this.setState({
            nameError,
            serverError,
            serverNameError,
            serverPortError,
            uuidError,
            passwordError,
        });
        return !nameError && !serverError && !serverNameError && !serverPortError && !uuidError && !passwordError;
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
                            this.setState({name: this.state.name});
                            this.#validate();
                        }}/>
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>服务器</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.serverError ? "error" : ""}`}>
                        <input type="text" placeholder="IPv4、IPv6 或域名" value={this.state.server} onChange={(e) => {
                            this.state.server = e.target.value;
                            this.setState({server: this.state.server});
                            this.#validate();
                        }}/>
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>Server Name</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.serverNameError ? "error" : ""}`}>
                        <input type="text" placeholder="TLS 域名，如 example.com" value={this.state.serverName}
                               onChange={(e) => {
                                   this.state.serverName = e.target.value;
                                   this.setState({serverName: this.state.serverName});
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
                                   this.setState({serverPort: this.state.serverPort});
                                   this.#validate();
                               }}/>
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>UUID</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.uuidError ? "error" : ""}`}>
                        <input type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={this.state.uuid}
                               onChange={(e) => {
                                   this.state.uuid = e.target.value;
                                   this.setState({uuid: this.state.uuid});
                                   this.#validate();
                               }}/>
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>密码</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.passwordError ? "error" : ""}`}>
                        <input type="password" placeholder="请输入密码" value={this.state.password} onChange={(e) => {
                            this.state.password = e.target.value;
                            this.setState({password: this.state.password});
                            this.#validate();
                        }}/>
                    </div>
                </div>
            </div>
            <div className="form-item">
                <label>拥塞控制</label>
                <div className="form-field">
                    <antd.Select
                        value={this.state.congestionControl}
                        style={{width: "100%"}}
                        onChange={(val) => {
                            this.state.congestionControl = val;
                            this.setState({congestionControl: this.state.congestionControl});
                        }}
                        options={this.#congestionControlOptions}
                    />
                </div>
            </div>
            <div className="form-item">
                <label>UDP Relay Mode</label>
                <div className="form-field">
                    <antd.Select
                        value={this.state.udpRelayMode}
                        style={{width: "100%"}}
                        onChange={(val) => {
                            this.state.udpRelayMode = val;
                            this.setState({udpRelayMode: this.state.udpRelayMode});
                        }}
                        options={this.#udpRelayModeOptions}
                    />
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
                        }}
                        options={this.#networkOptions}
                    />
                </div>
            </div>
        </div>
    }
}

export default TuicForm
