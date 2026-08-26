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
 * VlessForm
 * https://sing-box.sagernet.org/zh/configuration/outbound/vless/
 *
 * {
 *   "type": "vless",
 *   "tag": "vless-out",
 *
 *   "server": "127.0.0.1",                 //普通 input  必须输入  ip4或ip6或域名
 *   "server_name" : "example.com",        //普通 input   这个不是标准属性, 最终会填入 tls.server_name  (可以为空,如果为空的情况下, tls.enabled=false)
 *   "server_port": 1080,                   //普通 input 只能输入数字  1->65535
 *   "uuid": "bf000d23-0752-40b4-affe-68f7707a9661", //普通 input  必须输入  uuid
 *   "flow": "xtls-rprx-vision",            //antd.Select None=""/xtls-rprx-vision="xtls-rprx-vision" default None
 *   "network": "tcp",                      //tcp or udp, default all  //使用antd.Select  ALL=""/TCP="tcp"/UDP="udp"
 *   "tls": {},                                 //不实现管理,  由 server_name 决定       "tls": { "enabled": true, "server_name": "xxx.xxx.net"}
 *   "packet_encoding": "",             //不实现
 *   "multiplex": {},  //不实现
 *   "transport": {}, //不实现
 *
 *   ... // 拨号字段
 * }
 *
 *
 */
class VlessForm extends React.Component {

    // 唯一的ID
    #uuid = ""

    #networkOptions = [
        {label: "ALL", value: ""},
        {label: "TCP", value: "tcp"},
        {label: "UDP", value: "udp"},
    ]

    #flowOptions = [
        {label: "None", value: ""},
        {label: "xtls-rprx-vision", value: "xtls-rprx-vision"},
    ]

    constructor(props) {
        super(props);
        if (props.onRef) {
            try {
                props.onRef(this);
            } catch (e) {
                console.error("VlessForm onRef error", e);
            }
        }
        this.#uuid = this.$helper.getUUid();
        this.state = {
            name: "",       // 节点名称
            server: "",     // 服务器地址，支持 IPv4 / IPv6 / 域名
            serverName: "", // TLS Server Name（可选，空则不启用 TLS）
            serverPort: "", // 端口
            uuid: "",       // VLESS UUID
            flow: "",       // 流控
            network: "",    // 网络协议
            nameError: false,
            serverError: false,
            serverPortError: false,
            uuidError: false,
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
        const hasTls = !!state.serverName.trim();
        return {
            tag: this.#uuid,
            is_default: false,
            type: "vless",
            name: state.name.trim(),
            server: state.server.trim(),
            server_port: Number(state.serverPort),
            uuid: state.uuid.trim(),
            flow: state.flow,
            network: state.network,
            tls: hasTls
                ? {enabled: true, server_name: state.serverName.trim()}
                : {enabled: false},
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

    #validate() {
        const {name, server, serverPort, uuid} = this.state;
        const nameError = !name || !name.trim();
        const serverError = !server || !(server.trim().isIPv4() || server.trim().isIPv6() || server.trim().isDomain());
        const serverPortError = !serverPort || !serverPort.isPort();
        const uuidError = !this.#isUuidValid(uuid);

        this.setState({nameError, serverError, serverPortError, uuidError});
        return !nameError && !serverError && !serverPortError && !uuidError;
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
                    <div className="nlc-input">
                        <input type="text" placeholder="TLS 域名，留空则不启用 TLS" value={this.state.serverName}
                               onChange={(e) => {
                                   this.state.serverName = e.target.value;
                                   this.setState({serverName: this.state.serverName});
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
                <label>Flow</label>
                <div className="form-field">
                    <antd.Select
                        value={this.state.flow}
                        style={{width: "100%"}}
                        onChange={(val) => {
                            this.state.flow = val;
                            this.setState({flow: this.state.flow});
                        }}
                        options={this.#flowOptions}
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

export default VlessForm
