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
 * ShadowsocksForm
 * https://sing-box.sagernet.org/configuration/outbound/shadowsocks/
 *
 * {
 *   "type": "shadowsocks",
 *   "tag": "ss-out",                         //这个东西添加的时候自动生成一个uuid
 *
 *   "server": "127.0.0.1",                   //普通 input  必须输入  ip4或ip6或域名
 *   "server_port": 1080,                     //普通 input 只能输入数字  1->65535
 *   "method": "2022-blake3-aes-128-gcm",     //使用antd.Select 列出所有 Encryption 和 Legacy encryption  默认使用 2022-blake3-aes-128-gcm
 *   "password": "8JCsPssfgS8tiRwiMlhARg==",  // 普通 input  必须输入
 *   "plugin": "",                  //不实现
 *   "plugin_opts": "",            //不实现
 *   "network": "udp",  //tcp or udp, default all  //使用antd.Select  ALL=""/TCP="tcp"/UDP="udp"
 *   "udp_over_tcp": false | {},  //antd.Switch  default false
 *   "multiplex": {},             //不实现
 *   ... // Dial Fields
 * }
 *
 *
 * Encryption methods:
 * 2022-blake3-aes-128-gcm
 * 2022-blake3-aes-256-gcm
 * 2022-blake3-chacha20-poly1305
 * none
 * aes-128-gcm
 * aes-192-gcm
 * aes-256-gcm
 * chacha20-ietf-poly1305
 * xchacha20-ietf-poly1305
 *
 * Legacy encryption methods:
 * aes-128-ctr
 * aes-192-ctr
 * aes-256-ctr
 * aes-128-cfb
 * aes-192-cfb
 * aes-256-cfb
 * rc4-md5
 * chacha20-ietf
 * xchacha20
 *
 *
 */
class ShadowsocksForm extends React.Component {

    // 唯一的ID
    #uuid = ""
    //isDefault
    #isDefault = false;

    //网络协议选项
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

    //加密方式选项
    #methodOptions = [
        {
            label: "无",
            value: "none"
        },
        {
            label: "2022-blake3-aes-128-gcm",
            value: "2022-blake3-aes-128-gcm"
        },
        {
            label: "2022-blake3-aes-256-gcm",
            value: "2022-blake3-aes-256-gcm"
        },
        {
            label: "2022-blake3-chacha20-poly1305",
            value: "2022-blake3-chacha20-poly1305"
        },
        {
            label: "aes-128-gcm",
            value: "aes-128-gcm"
        },
        {
            label: "aes-192-gcm",
            value: "aes-192-gcm"
        },
        {
            label: "aes-256-gcm",
            value: "aes-256-gcm"
        },
        {
            label: "chacha20-ietf-poly1305",
            value: "chacha20-ietf-poly1305"
        },
        {
            label: "xchacha20-ietf-poly1305",
            value: "xchacha20-ietf-poly1305"
        },
        {
            label: "aes-128-ctr",
            value: "aes-128-ctr"
        },
        {
            label: "aes-192-ctr",
            value: "aes-192-ctr"
        },
        {
            label: "aes-256-ctr",
            value: "aes-256-ctr"
        },
        {
            label: "aes-128-cfb",
            value: "aes-128-cfb"
        },
        {
            label: "aes-192-cfb",
            value: "aes-192-cfb"
        },
        {
            label: "aes-256-cfb",
            value: "aes-256-cfb"
        },
        {
            label: "rc4-md5",
            value: "rc4-md5"
        },
        {
            label: "chacha20-ietf",
            value: "chacha20-ietf"
        },
        {
            label: "xchacha20",
            value: "xchacha20"
        }
    ]

    constructor(props) {
        super(props);
        if (props.onRef) {
            try {
                props.onRef(this);
            } catch (e) {
                console.error("ShadowsocksForm onRef error:", e);
            }
        }
        this.#uuid = this.$helper.getUUid();
        this.state = {
            name: "", // 节点名称
            server: "", // 服务器地址
            serverPort: "", // 端口
            password: "", // 密码
            network: "", //网络协议
            method: "2022-blake3-aes-128-gcm", //加密方式
            udpOverTcp: false, //UDP over TCP
            nameError: false,
            serverError: false,
            serverPortError: false,
            passwordError: false,
        }
        const editData = (props.config && props.config.data) || null;
        if (editData) {
            this.#uuid = editData.tag || this.#uuid;
            this.#isDefault = editData.is_default || false;
            console.log("ShadowsocksForm editData", editData);
            this.state.name = editData.name || "";
            this.state.server = editData.server || "";
            this.state.serverPort = editData.server_port.toString() || "";
            this.state.password = editData.password || "";
            this.state.network = editData.network || "";
            this.state.method = editData.method || "2022-blake3-aes-128-gcm";
            this.state.udpOverTcp = !!editData.udp_over_tcp;
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

    #buildValue(state) {
        return {
            tag: this.#uuid,
            is_default: this.#isDefault,
            type: "shadowsocks",
            name: state.name.trim(),
            server: state.server.trim(),
            server_port: Number(state.serverPort),
            method: state.method,
            password: state.password,
            network: state.network,
            udp_over_tcp: state.udpOverTcp,
        };
    }

    #validate() {
        const {name, server, serverPort, password} = this.state;
        const nameError = !name || !name.trim();
        const serverError = !server || !server.trim().isHost();
        const serverPortError = !serverPort || !serverPort.isPort();
        const passwordError = !password || !password.trim();

        this.setState({
            nameError,
            serverError,
            serverPortError,
            passwordError,
        });
        return !nameError && !serverError && !serverPortError && !passwordError;
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
                        <input type="text" placeholder="IP或域名" value={this.state.server} onChange={(e) => {
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
                <label>密码</label>
                <div className="form-field">
                    <div className={`nlc-input ${this.state.passwordError ? "error" : ""}`}>
                        <input type="password" placeholder="请输入密码" value={this.state.password} onChange={(e) => {
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
                <label>加密方式</label>
                <div className="form-field">
                    <antd.Select
                        value={this.state.method}
                        style={{width: "100%"}}
                        onChange={(val) => {
                            this.setState({method: val});
                        }}
                        options={this.#methodOptions}
                    />
                    <div className="form-help-tag">
                        推荐优先使用 2022 系列加密方式。
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
                            this.setState({network: val});
                        }}
                        options={this.#networkOptions}
                    />
                </div>
            </div>
            <div className="form-item">
                <label>UDP over TCP</label>
                <div className="form-field">
                    <div className="nlc-empty">
                        <antd.Switch
                            checked={this.state.udpOverTcp}
                            onChange={(val) => {
                                this.setState({udpOverTcp: val});
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    }
}

export default ShadowsocksForm
