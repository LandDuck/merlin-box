/*
 * # merlin-box - A sing-box + smartdns routing and proxy script solution for ASUSWRT-Merlin routers.
 * # Copyright (C) 2026 LandDuck <https://github.com/LandDuck/>
 * #
 * # This program is free software: you can redistribute it and/or modify
 * # it under the terms of the GNU General Public License as published by
 * # the Free Software Foundation, either version 3 of the License, or
 * # the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * # See the GNU General Public License for more details.
 * #
 * # You should have received a copy of the GNU General Public License
 * # along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import React from "react";

/**
 * TrojanForm
 * https://sing-box.sagernet.org/zh/configuration/outbound/trojan/
 *
 * {
 *   "type": "trojan",
 *   "tag": "trojan-out",
 *
 *   "server": "127.0.0.1",                 // 普通 input 必须输入 IP4 / IP6 / 域名
 *   "server_name": "example.com",          // 普通 input 必须输入域名
 *                                           // 最终填入 tls.server_name
 *   "server_port": 1080,                   // 普通 input 只能输入数字 1->65535
 *   "password": "password",                // 普通 input 必须输入
 *   "network": "tcp",                      // tcp / udp / 空
 *
 *   "tls": {
 *       "enabled": true,
 *       "server_name": "example.com"
 *   },
 *
 *   "multiplex": {},                       // 不实现
 *
 *   "transport": {},                       // 由 antd.Select 选择传输层
 *                                           // transport.type = "" 默认空
 *                                           // 可选值 http/ws/quic/grpc/httpupgrade
 *
 *   **transport.type = 'http'**
 *   transport.type = 'http'
 *   transport.host = "xxx.xxx.net"         // 普通 input 默认空
 *   transport.path = "/"                   // 普通 input 默认 /
 *   transport.method = "GET"               // antd.Select GET / POST 默认 GET
 *
 *   **transport.type = 'ws'**
 *   transport.type = 'ws'
 *   transport.path = "/"                   // 普通 input 默认 /
 *
 *   **transport.type = 'quic'**
 *   transport.type = 'quic'
 *
 *   **transport.type = 'grpc'**
 *   transport.type = 'grpc'
 *   transport.service_name = "xxx"         // 普通 input 默认空
 *
 *   **transport.type = 'httpupgrade'**
 *   transport.type = 'httpupgrade'
 *   transport.host = "xxx.xxx.net"         // 普通 input 默认空
 *   transport.path = "/"                   // 普通 input 默认 /
 */
class TrojanForm extends React.Component {

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

    #transportOptions = [
        {
            label: "None",
            value: ""
        },
        {
            label: "HTTP",
            value: "http"
        },
        {
            label: "WebSocket",
            value: "ws"
        },
        {
            label: "QUIC",
            value: "quic"
        },
        {
            label: "gRPC",
            value: "grpc"
        },
        {
            label: "HTTPUpgrade",
            value: "httpupgrade"
        }
    ]

    #httpMethodOptions = [
        {
            label: "GET",
            value: "GET"
        },
        {
            label: "POST",
            value: "POST"
        }
    ]

    constructor(props) {
        super(props);

        if (props.onRef) {
            try {
                props.onRef(this);
            } catch (e) {
                console.error("TrojanForm onRef error:", e);
            }
        }

        this.#uuid = this.$helper.getUUid();

        this.state = {
            name: "",               // 节点名称
            server: "",             // 服务器地址，支持 IPv4 / IPv6 / 域名
            serverName: "",         // TLS Server Name
            serverPort: "",         // 端口
            password: "",           // 密码
            network: "",            // 网络协议

            // Transport
            transportType: "",      // 传输协议
            transportHost: "",      // HTTP / HTTPUpgrade Host
            transportPath: "/",     // HTTP / WebSocket / HTTPUpgrade Path
            transportMethod: "GET", // HTTP Method
            transportServiceName: "", // gRPC Service Name

            nameError: false,
            serverError: false,
            serverNameError: false,
            serverPortError: false,
            passwordError: false,
        }
        const editData = (props.config && props.config.data) || null;
        if (editData) {
            this.#uuid = editData.tag || this.#uuid;
            this.#isDefault = editData.is_default || false;
            console.log("TrojanForm editData", editData);
            this.state.name = editData.name || "";
            this.state.server = editData.server || "";
            this.state.serverName = (editData.tls && editData.tls.server_name) || "";
            this.state.serverPort = editData.server_port.toString() || "";
            this.state.password = editData.password || "";
            this.state.network = editData.network || "";

            const transport = editData.transport || {};
            this.state.transportType = transport.type || "";
            this.state.transportHost = transport.host || "";
            this.state.transportPath = transport.path || "/";
            this.state.transportMethod = transport.method || "GET";
            this.state.transportServiceName = transport.service_name || "";
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

        // 构建 Transport
        let transport = null;

        switch (state.transportType) {

            case "http":
                transport = {
                    type: "http",
                    host: state.transportHost.trim(),
                    path: state.transportPath.trim() || "/",
                    method: state.transportMethod
                };
                break;

            case "ws":
                transport = {
                    type: "ws",
                    path: state.transportPath.trim() || "/"
                };
                break;

            case "quic":
                transport = {
                    type: "quic"
                };
                break;

            case "grpc":
                transport = {
                    type: "grpc",
                    service_name: state.transportServiceName.trim()
                };
                break;

            case "httpupgrade":
                transport = {
                    type: "httpupgrade",
                    host: state.transportHost.trim(),
                    path: state.transportPath.trim() || "/"
                };
                break;

            default:
                transport = null;
                break;
        }

        const value = {
            tag: this.#uuid,
            is_default: this.#isDefault,
            type: "trojan",
            name: state.name.trim(),
            server: state.server.trim(),
            server_port: Number(state.serverPort),
            password: state.password,
            network: state.network,

            tls: {
                enabled: true,
                server_name: state.serverName.trim(),
            }
        };

        // 未选择 Transport 时，不输出 transport
        if (transport) {
            value.transport = transport;
        }

        return value;
    }

    /**
     * 验证表单
     * @returns {boolean} 验证结果
     */
    #validate() {

        const {
            name,
            server,
            serverName,
            serverPort,
            password
        } = this.state;

        const nameError =
            !name ||
            !name.trim();

        const serverError =
            !server ||
            !server.trim().isHost();

        const serverNameError =
            !serverName ||
            !serverName.trim().isDomain();

        const serverPortError =
            !serverPort ||
            !serverPort.isPort();

        const passwordError =
            !password ||
            !password.trim();

        this.setState({
            nameError,
            serverError,
            serverNameError,
            serverPortError,
            passwordError,
        });

        return !nameError &&
            !serverError &&
            !serverNameError &&
            !serverPortError &&
            !passwordError;
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
             * 无额外配置
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
                                placeholder="IP或域名"
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
                        <div className={`nlc-input ${this.state.serverNameError ? "error" : ""}`}>
                            <input
                                type="text"
                                placeholder="TLS域名，如 example.com"
                                value={this.state.serverName}
                                onChange={(e) => {
                                    this.state.serverName = e.target.value;

                                    this.setState({
                                        serverName: this.state.serverName
                                    });

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
                    <label>密码</label>
                    <div className="form-field">
                        <div className={`nlc-input ${this.state.passwordError ? "error" : ""}`}>
                            <input
                                type="password"
                                placeholder="请输入密码"
                                value={this.state.password}
                                onChange={(e) => {
                                    this.state.password = e.target.value;

                                    this.setState({
                                        password: this.state.password
                                    });

                                    this.#validate();
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

                                this.setState({
                                    network: this.state.network
                                });

                                this.#validate();
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

export default TrojanForm
