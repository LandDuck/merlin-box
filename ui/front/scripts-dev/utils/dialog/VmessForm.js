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
 * VmessForm
 * https://sing-box.sagernet.org/zh/configuration/outbound/vmess/
 *
 * {
 *   "type": "vmess",
 *   "tag": "vmess-out",
 *
 *   "server": "127.0.0.1",                 //普通 input  必须输入  ip4或ip6或域名
 *   "server_name" : "example.com",        //普通 input   这个不是标准属性, 最终会填入 tls.server_name
 *                                           (可以为空, 如果为空的情况下, tls.enabled=false)
 *   "server_port": 1080,                  //普通 input 只能输入数字 1->65535
 *   "uuid": "bf000d23-0752-40b4-affe-68f7707a9661", //普通 input 必须输入 uuid
 *   "security": "auto",                  //antd.Select 默认 auto
 *   "alter_id": 0,                       //antd.Select 默认 0
 *   "global_padding": false,             //不实现
 *   "authenticated_length": true,        //不实现
 *   "network": "tcp",                   //tcp or udp, default all
 *                                           //antd.Select ALL="" / TCP="tcp" / UDP="udp"
 *   "tls": {},                           //不实现管理, 由 server_name 决定
 *                                           //tls: { enabled: true, server_name: "xxx.xxx.net" }
 *   "packet_encoding": "",               //不实现
 *   "multiplex": {},                     //不实现
 *   "transport": {},                     //由 antd.Select 选择传输层
 *                                           //transport.type = "" 默认空
 *                                           //可选值 http/ws/quic/grpc/httpupgrade
 *
 *   注意 transport 各种类型选项不同
 *
 *   **transport.type = 'http'**
 *   transport.type = 'http'              //由上面的 select 决定
 *   transport.host = "xxx.xxx.net"       //普通 input 默认空
 *   transport.path = "/"                 //普通 input 默认 /
 *   transport.method = "GET"             //antd.Select GET/POST 默认 GET
 *
 *   **transport.type = 'ws'**
 *   transport.type = 'ws'                //由上面的 select 决定
 *   transport.path = "/"                 //普通 input 默认 /
 *
 *   **transport.type = 'quic'**
 *   transport.type = 'quic'              //由上面的 select 决定
 *
 *   **transport.type = 'grpc'**
 *   transport.type = 'grpc'              //由上面的 select 决定
 *   transport.service_name = "xxx"       //普通 input 默认空
 *
 *   **transport.type = 'httpupgrade'**
 *   transport.type = 'httpupgrade'       //由上面的 select 决定
 *   transport.host = "xxx.xxx.net"       //普通 input 默认空
 *   transport.path = "/"                 //普通 input 默认 /
 *
 *   ... // 拨号字段
 *
 *   security
 *   加密方法：
 *   auto
 *   none
 *   zero
 *   aes-128-gcm
 *   chacha20-poly1305
 *
 *   旧加密方法：
 *   aes-128-ctr
 *
 *   alter_id
 *   0   禁用旧协议
 *   1   启用旧协议
 */
class VmessForm extends React.Component {

    // 唯一的ID
    #uuid = ""

    #networkOptions = [
        {label: "ALL", value: ""},
        {label: "TCP", value: "tcp"},
        {label: "UDP", value: "udp"},
    ]

    #securityOptions = [
        {label: "auto", value: "auto"},
        {label: "none", value: "none"},
        {label: "zero", value: "zero"},
        {label: "aes-128-gcm", value: "aes-128-gcm"},
        {label: "chacha20-poly1305", value: "chacha20-poly1305"},
        {label: "aes-128-ctr", value: "aes-128-ctr"},
    ]

    #alterIdOptions = [
        {label: "0 (禁用旧协议)", value: 0},
        {label: "1 (启用旧协议)", value: 1},
    ]

    #transportOptions = [
        {label: "None", value: ""},
        {label: "HTTP", value: "http"},
        {label: "WebSocket", value: "ws"},
        {label: "QUIC", value: "quic"},
        {label: "gRPC", value: "grpc"},
        {label: "HTTPUpgrade", value: "httpupgrade"},
    ]

    #httpMethodOptions = [
        {label: "GET", value: "GET"},
        {label: "POST", value: "POST"},
    ]

    constructor(props) {
        super(props);

        if (props.onRef) {
            try {
                props.onRef(this);
            } catch (e) {
                console.error("VmessForm onRef error", e);
            }
        }

        this.#uuid = this.$helper.getUUid();

        this.state = {
            name: "",       // 节点名称
            server: "",     // 服务器地址，支持 IPv4 / IPv6 / 域名
            serverName: "", // TLS Server Name（可选，空则不启用 TLS）
            serverPort: "", // 端口
            uuid: "",       // VMess UUID
            security: "auto", // 加密方式
            alterId: 0,     // Alter ID
            network: "",    // 网络协议

            // Transport
            transportType: "",        // 传输协议
            transportHost: "",        // HTTP / HTTPUpgrade Host
            transportPath: "/",       // HTTP / WebSocket / HTTPUpgrade Path
            transportMethod: "GET",   // HTTP Method
            transportServiceName: "", // gRPC Service Name

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

        // 构建 Transport
        const transport = {
            type: state.transportType
        };

        switch (state.transportType) {

            case "http":
                transport.host = state.transportHost.trim();
                transport.path = state.transportPath.trim() || "/";
                transport.method = state.transportMethod;
                break;

            case "ws":
                transport.path = state.transportPath.trim() || "/";
                break;

            case "quic":
                // QUIC 无额外配置
                break;

            case "grpc":
                transport.service_name = state.transportServiceName.trim();
                break;

            case "httpupgrade":
                transport.host = state.transportHost.trim();
                transport.path = state.transportPath.trim() || "/";
                break;

            default:
                // None
                break;
        }

        return {
            tag: this.#uuid,
            is_default: false,
            type: "vmess",
            name: state.name.trim(),
            server: state.server.trim(),
            server_port: Number(state.serverPort),
            uuid: state.uuid.trim(),
            security: state.security,
            alter_id: state.alterId,
            network: state.network,
            tls: hasTls
                ? {
                    enabled: true,
                    server_name: state.serverName.trim()
                }
                : {
                    enabled: false
                },
            transport,
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
        const {
            name,
            server,
            serverPort,
            uuid
        } = this.state;

        const nameError = !name || !name.trim();

        const serverError =
            !server ||
            !(
                server.trim().isIPv4() ||
                server.trim().isIPv6() ||
                server.trim().isDomain()
            );

        const serverPortError =
            !serverPort ||
            !serverPort.isPort();

        const uuidError =
            !this.#isUuidValid(uuid);

        this.setState({
            nameError,
            serverError,
            serverPortError,
            uuidError
        });

        return !nameError &&
            !serverError &&
            !serverPortError &&
            !uuidError;
    }

    /**
     * 渲染 Transport 配置
     * @returns
     */
    #renderTransportOptions() {
        const {
            transportType,
            transportHost,
            transportPath,
            transportMethod,
            transportServiceName
        } = this.state;

        switch (transportType) {

            /**
             * HTTP
             *
             * transport.type = "http"
             * transport.host
             * transport.path
             * transport.method
             */
            case "http":
                return (
                    <>
                        <div className="form-item">
                            <label>Host</label>
                            <div className="form-field">
                                <div className="nlc-input">
                                    <input
                                        type="text"
                                        placeholder="HTTP Host"
                                        value={transportHost}
                                        onChange={(e) => {
                                            this.state.transportHost = e.target.value;
                                            this.setState({
                                                transportHost: this.state.transportHost
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-item">
                            <label>Path</label>
                            <div className="form-field">
                                <div className="nlc-input">
                                    <input
                                        type="text"
                                        placeholder="/"
                                        value={transportPath}
                                        onChange={(e) => {
                                            this.state.transportPath = e.target.value;
                                            this.setState({
                                                transportPath: this.state.transportPath
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-item">
                            <label>Method</label>
                            <div className="form-field">
                                <antd.Select
                                    value={transportMethod}
                                    style={{width: "100%"}}
                                    onChange={(val) => {
                                        this.state.transportMethod = val;
                                        this.setState({
                                            transportMethod: this.state.transportMethod
                                        });
                                    }}
                                    options={this.#httpMethodOptions}
                                />
                            </div>
                        </div>
                    </>
                );

            /**
             * WebSocket
             *
             * transport.type = "ws"
             * transport.path
             */
            case "ws":
                return (
                    <div className="form-item">
                        <label>Path</label>
                        <div className="form-field">
                            <div className="nlc-input">
                                <input
                                    type="text"
                                    placeholder="/"
                                    value={transportPath}
                                    onChange={(e) => {
                                        this.state.transportPath = e.target.value;
                                        this.setState({
                                            transportPath: this.state.transportPath
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                );

            /**
             * QUIC
             *
             * transport.type = "quic"
             *
             * QUIC 无额外配置
             */
            case "quic":
                return null;

            /**
             * gRPC
             *
             * transport.type = "grpc"
             * transport.service_name
             */
            case "grpc":
                return (
                    <div className="form-item">
                        <label>Service Name</label>
                        <div className="form-field">
                            <div className="nlc-input">
                                <input
                                    type="text"
                                    placeholder="Service Name"
                                    value={transportServiceName}
                                    onChange={(e) => {
                                        this.state.transportServiceName = e.target.value;
                                        this.setState({
                                            transportServiceName: this.state.transportServiceName
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                );

            /**
             * HTTPUpgrade
             *
             * transport.type = "httpupgrade"
             * transport.host
             * transport.path
             */
            case "httpupgrade":
                return (
                    <>
                        <div className="form-item">
                            <label>Host</label>
                            <div className="form-field">
                                <div className="nlc-input">
                                    <input
                                        type="text"
                                        placeholder="HTTP Host"
                                        value={transportHost}
                                        onChange={(e) => {
                                            this.state.transportHost = e.target.value;
                                            this.setState({
                                                transportHost: this.state.transportHost
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-item">
                            <label>Path</label>
                            <div className="form-field">
                                <div className="nlc-input">
                                    <input
                                        type="text"
                                        placeholder="/"
                                        value={transportPath}
                                        onChange={(e) => {
                                            this.state.transportPath = e.target.value;
                                            this.setState({
                                                transportPath: this.state.transportPath
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                );

            default:
                return null;
        }
    }

    /**
     * 渲染方法
     * @return
     */
    render() {
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
                                    this.setState({
                                        name: this.state.name
                                    });
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
                                    this.setState({
                                        server: this.state.server
                                    });
                                    this.#validate();
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-item">
                    <label>Server Name</label>
                    <div className="form-field">
                        <div className="nlc-input">
                            <input
                                type="text"
                                placeholder="TLS 域名，留空则不启用 TLS"
                                value={this.state.serverName}
                                onChange={(e) => {
                                    this.state.serverName = e.target.value;
                                    this.setState({
                                        serverName: this.state.serverName
                                    });
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
                                    this.setState({
                                        serverPort: this.state.serverPort
                                    });
                                    this.#validate();
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-item">
                    <label>UUID</label>
                    <div className="form-field">
                        <div className={`nlc-input ${this.state.uuidError ? "error" : ""}`}>
                            <input
                                type="text"
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                value={this.state.uuid}
                                onChange={(e) => {
                                    this.state.uuid = e.target.value;
                                    this.setState({
                                        uuid: this.state.uuid
                                    });
                                    this.#validate();
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-item">
                    <label>加密方式</label>
                    <div className="form-field">
                        <antd.Select
                            value={this.state.security}
                            style={{width: "100%"}}
                            onChange={(val) => {
                                this.state.security = val;
                                this.setState({
                                    security: this.state.security
                                });
                            }}
                            options={this.#securityOptions}
                        />
                    </div>
                </div>

                <div className="form-item">
                    <label>Alter ID</label>
                    <div className="form-field">
                        <antd.Select
                            value={this.state.alterId}
                            style={{width: "100%"}}
                            onChange={(val) => {
                                this.state.alterId = val;
                                this.setState({
                                    alterId: this.state.alterId
                                });
                            }}
                            options={this.#alterIdOptions}
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
                                this.setState({
                                    network: this.state.network
                                });
                            }}
                            options={this.#networkOptions}
                        />
                    </div>
                </div>

                {/* ==================== 传输协议 ==================== */}

                <div className="form-item">
                    <label>传输协议</label>
                    <div className="form-field">
                        <antd.Select
                            value={this.state.transportType}
                            style={{width: "100%"}}
                            onChange={(val) => {
                                this.state.transportType = val;
                                this.setState({
                                    transportType: this.state.transportType
                                });
                            }}
                            options={this.#transportOptions}
                        />
                    </div>
                </div>

                {this.#renderTransportOptions()}

            </div>
        );
    }
}

export default VmessForm;
