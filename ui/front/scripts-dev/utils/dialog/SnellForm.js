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
 * SnellForm
 * https://sing-box.sagernet.org/zh/configuration/outbound/snell
 *
 {
 "type": "snell",
 "tag": "snell-out",

 "server": "127.0.0.1",   //普通 input  必须输入  ip4或ip6或域名
 "server_port": 1080,     //普通 input 只能输入数字  1->65535
 "version": 4,           //antd.Select v4 or v6
 "psk": "password",       //普通 input  必须输入
 "userkey": "",           //普通 input
 "reuse": false,         //antd.Switch 默认关闭
 "network": "tcp",       //tcp or udp, default all  //使用antd.Select  ALL=""/TCP="tcp"/UDP="udp"
 "obfs_mode": "",        //antd.Select  none or http
 "obfs_host": "",        //普通 input 仅在 obfs_mode=http 时必填

 ... // 拨号字段
 }

 版本 6 结构
 {
 "type": "snell",
 "tag": "snell-out",

 "server": "127.0.0.1",  //普通 input  必须输入  ip4或ip6或域名
 "server_port": 1080, //普通 input 只能输入数字  1->65535
 "version": 6, //antd.Select v4 or v6
 "psk": "password",  //普通 input  必须输入
 "userkey": "", //普通 input
 "reuse": false, //antd.Switch 默认关闭
 "network": "tcp",  //tcp or udp, default all  //使用antd.Select  ALL=""/TCP="tcp"/UDP="udp"
 "mode": "",   //antd.Select  default unshaped unsafe-raw 之一。

 ... // 拨号字段
 }

 */
class SnellForm extends React.Component {

    // 唯一的ID
    #uuid = ""
    //isDefault
    #isDefault = false;

    #networkOptions = [
        {label: "ALL", value: ""},
        {label: "TCP", value: "tcp"},
        {label: "UDP", value: "udp"},
    ]

    #versionOptions = [
        {label: "v4", value: 4},
        {label: "v6", value: 6},
    ]

    #obfsModeOptions = [
        {label: "None", value: ""},
        {label: "HTTP", value: "http"},
    ]

    #modeOptions = [
        {label: "Default", value: ""},
        {label: "default", value: "default"},
        {label: "unshaped", value: "unshaped"},
        {label: "unsafe-raw", value: "unsafe-raw"},
    ]

    constructor(props) {
        super(props);

        if (props.onRef) {
            try {
                props.onRef(this);
            } catch (e) {
                console.error("SnellForm onRef error", e);
            }
        }

        this.#uuid = this.$helper.getUUid();

        this.state = {
            name: "",       // 节点名称
            server: "",     // 服务器地址，支持 IPv4 / IPv6 / 域名
            serverPort: "", // 端口
            version: 4,      // Snell 版本
            psk: "",        // 密码
            userkey: "",    // 可选
            reuse: false,
            network: "",
            obfsMode: "",
            obfsHost: "",
            mode: "",

            nameError: false,
            serverError: false,
            serverPortError: false,
            pskError: false,
            obfsHostError: false,
        }
        const editData = (props.config && props.config.data) || null;
        if (editData) {
            this.#uuid = editData.tag || this.#uuid;
            this.#isDefault = editData.is_default || false;
            console.log("SnellForm editData", editData);
            this.state.name = editData.name || "";
            this.state.server = editData.server || "";
            this.state.serverPort = editData.server_port.toString() || "";
            this.state.version = editData.version === undefined || editData.version === null ? 4 : Number(editData.version);
            this.state.psk = editData.psk || "";
            this.state.userkey = editData.userkey || "";
            this.state.reuse = !!editData.reuse;
            this.state.network = editData.network || "";
            this.state.obfsMode = editData.obfs_mode || "";
            this.state.obfsHost = editData.obfs_host || "";
            this.state.mode = editData.mode || "";
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
     * @returns {object}
     */
    #buildValue(state) {
        const value = {
            tag: this.#uuid,
            is_default: this.#isDefault,
            type: "snell",
            name: state.name.trim(),
            server: state.server.trim(),
            server_port: Number(state.serverPort),
            version: Number(state.version),
            psk: state.psk.trim(),
            network: state.network,
            reuse: !!state.reuse,
        };

        if (state.userkey && state.userkey.trim()) {
            value.userkey = state.userkey.trim();
        }

        if (Number(state.version) === 4) {
            if (state.obfsMode) {
                value.obfs_mode = state.obfsMode;
            }

            if (state.obfsMode === "http" && state.obfsHost && state.obfsHost.trim()) {
                value.obfs_host = state.obfsHost.trim();
            }
        } else {
            if (state.mode) {
                value.mode = state.mode;
            }
        }

        return value;
    }

    #validate() {
        const {
            name,
            server,
            serverPort,
            psk,
            version,
            obfsMode,
            obfsHost,
        } = this.state;

        const nameError = !name || !name.trim();

        const serverError = !server || !(
            server.trim().isIPv4() ||
            server.trim().isIPv6() ||
            server.trim().isDomain()
        );

        const serverPortError = !serverPort || !serverPort.isPort();
        const pskError = !psk || !psk.trim();
        const obfsHostError = Number(version) === 4 && obfsMode === "http" && (!obfsHost || !obfsHost.trim());

        this.setState({
            nameError,
            serverError,
            serverPortError,
            pskError,
            obfsHostError,
        });

        return !nameError &&
            !serverError &&
            !serverPortError &&
            !pskError &&
            !obfsHostError;
    }

    /**
     * 渲染方法
     * @return
     */
    render() {
        const {version, obfsMode, obfsHost} = this.state;
        const isV6 = Number(version) === 6;

        return (
            <div className="add-node-form">
                <div className="form-item">
                    <label>节点名称</label>
                    <div className="form-field">
                        <div className={`nlc-input ${this.state.nameError ? "error" : ""}`}>
                            <input
                                type="text"
                                placeholder="节点名称"
                                value={this.state.name}
                                onChange={(e) => {
                                    this.state.name = e.target.value;
                                    this.setState({name: this.state.name});
                                    this.#validate();
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-item">
                    <label>服务器</label>
                    <div className="form-field">
                        <div className={`nlc-input ${this.state.serverError ? "error" : ""}`}>
                            <input
                                type="text"
                                placeholder="IPv4、IPv6 或域名"
                                value={this.state.server}
                                onChange={(e) => {
                                    this.state.server = e.target.value;
                                    this.setState({server: this.state.server});
                                    this.#validate();
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-item">
                    <label>端口</label>
                    <div className="form-field">
                        <div className={`nlc-input ${this.state.serverPortError ? "error" : ""}`}>
                            <input
                                type="number"
                                min="1"
                                max="65535"
                                placeholder="1 - 65535"
                                value={this.state.serverPort}
                                onChange={(e) => {
                                    this.state.serverPort = e.target.value;
                                    this.setState({serverPort: this.state.serverPort});
                                    this.#validate();
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-item">
                    <label>版本</label>
                    <div className="form-field">
                        <antd.Select
                            value={this.state.version}
                            style={{width: "100%"}}
                            onChange={(val) => {
                                this.state.version = val;
                                this.setState({
                                    version: this.state.version,
                                    obfsMode: val === 4 ? this.state.obfsMode : "",
                                    obfsHost: val === 4 ? this.state.obfsHost : "",
                                    mode: val === 6 ? this.state.mode : "",
                                });
                                this.#validate();
                            }}
                            options={this.#versionOptions}
                        />
                    </div>
                </div>

                <div className="form-item">
                    <label>PSK</label>
                    <div className="form-field">
                        <div className={`nlc-input ${this.state.pskError ? "error" : ""}`}>
                            <input
                                type="password"
                                placeholder="请输入 PSK"
                                value={this.state.psk}
                                onChange={(e) => {
                                    this.state.psk = e.target.value;
                                    this.setState({psk: this.state.psk});
                                    this.#validate();
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-item">
                    <label>User Key</label>
                    <div className="form-field">
                        <div className="nlc-input">
                            <input
                                type="text"
                                placeholder="可选"
                                value={this.state.userkey}
                                onChange={(e) => {
                                    this.state.userkey = e.target.value;
                                    this.setState({userkey: this.state.userkey});
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-item">
                    <label>Reuse</label>
                    <div className="form-field">
                        <div className="nlc-empty">
                            <antd.Switch
                                checked={this.state.reuse}
                                onChange={(val) => {
                                    this.state.reuse = val;
                                    this.setState({reuse: this.state.reuse});
                                }}
                            />
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
                            }}
                            options={this.#networkOptions}
                        />
                    </div>
                </div>

                {!isV6 && (
                    <>
                        <div className="form-item">
                            <label>Obfs Mode</label>
                            <div className="form-field">
                                <antd.Select
                                    value={this.state.obfsMode}
                                    style={{width: "100%"}}
                                    onChange={(val) => {
                                        this.state.obfsMode = val;
                                        this.setState({
                                            obfsMode: this.state.obfsMode,
                                            obfsHost: val === "http" ? this.state.obfsHost : "",
                                        });
                                        this.#validate();
                                    }}
                                    options={this.#obfsModeOptions}
                                />
                            </div>
                        </div>

                        {obfsMode === "http" && (
                            <div className="form-item">
                                <label>Obfs Host</label>
                                <div className="form-field">
                                    <div className={`nlc-input ${this.state.obfsHostError ? "error" : ""}`}>
                                        <input
                                            type="text"
                                            placeholder="Obfs Host"
                                            value={obfsHost}
                                            onChange={(e) => {
                                                this.state.obfsHost = e.target.value;
                                                this.setState({obfsHost: this.state.obfsHost});
                                                this.#validate();
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {isV6 && (
                    <div className="form-item">
                        <label>Mode</label>
                        <div className="form-field">
                            <antd.Select
                                value={this.state.mode}
                                style={{width: "100%"}}
                                onChange={(val) => {
                                    this.state.mode = val;
                                    this.setState({mode: this.state.mode});
                                }}
                                options={this.#modeOptions}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

export default SnellForm;
