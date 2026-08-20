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
 * LoginPanel
 */
class Main extends React.Component {

    /**
     * 构造方法
     * @param props
     */
    constructor(props) {
        super(props);
    }

    /**
     * 渲染方法
     * @returns {JSX.Element}
     */
    render() {
        return [<div className="hero-header">
            <h1 className="hero-title">
                Merlin-box-UI
            </h1>

            <p className="hero-description">
                基于 ASUSWRT-Merlin 路由器环境的 sing-box + smartdns 分流代理脚本方案。
            </p>
        </div>, <div className="system-card mb-item">

            <div className="system-stats">

                <div className="system-stat">
                    <div className="stat-label">运行时间</div>
                    <div className="stat-value">14d 06h 22m</div>
                    <div className="stat-value danger">未运行</div>
                </div>

                <div className="system-stat">
                    <div className="stat-label">核心路径</div>
                    <div className="stat-value status">
                        {/*<span className="status-dot"/>*/}
                        /jffs/merlin-box
                    </div>
                    <div className="stat-value status danger">
                        未配置
                    </div>
                </div>

                <div className="system-stat">
                    <div className="stat-label">国内延时</div>
                    <div className="stat-value speed">
                        5.2 ms
                    </div>
                </div>

                <div className="system-stat">
                    <div className="stat-label">国内延时</div>
                    <div className="stat-value speed">
                        5.2 ms
                    </div>
                </div>

            </div>


            <div className="system-actions">

                <button className="btn-primary">
                    <span className="icon-play"/>
                    启动代理
                </button>

                <button className="btn-secondary">
                    <span className="icon-reboot"/>
                    重启代理
                </button>

            </div>

        </div>, <section className="node-network  mb-item">

            <div className="section-title">
                <span className="section-icon"/>
                <h2>节点列表</h2>
            </div>


            <div className="node-list">

                <div className="node-card node-active">

                    <div className="node-top">
                        <div className="node-icon active">
                            <span/>
                        </div>

                        <span className="node-tag">
          默认
        </span>
                    </div>


                    <div className="node-name">
                        Alpha-Gateway
                    </div>

                    <div className="node-ip">
                        192.168.1.1
                    </div>


                    <div className="node-actions">
                        <button className="node-action">
                            <span className="delete-icon"/>
                            删除
                        </button>
                    </div>

                </div>


                <div className="node-card">

                    <div className="node-top">
                        <div className="node-icon">
                            <span/>
                        </div>
                    </div>

                    <div className="node-name">
                        Beta-Relay
                    </div>

                    <div className="node-ip">
                        192.168.1.45
                    </div>

                    <div className="node-actions">
                        <button className="node-action primary">
                            设为默认
                        </button>
                        <button className="node-action">
                            删除
                        </button>
                    </div>

                </div>


                <div className="node-add">

                    <div className="add-icon">
                        <span/>
                    </div>

                    <div>
                        添加节点
                    </div>

                </div>


            </div>

        </section>, <div className="domain-config  mb-item">

            <div className="domain-panel">

                <div className="panel-title">
                    <span className="title-icon blacklist-icon"/>
                    <h3>域名黑名单</h3>
                </div>

                <textarea
                    className="domain-editor"
                    placeholder={"example.com\ntracker.net\nads.provider.io"}
                />

                <div className="panel-footer">
      <span className="hint">
        每行一个域名。支持通配符 (*).
      </span>

                    <button className="apply-button">
                        应用
                    </button>
                </div>

            </div>


            <div className="domain-panel">

                <div className="panel-title">
                    <span className="title-icon sinkhole-icon"/>
                    <h3>域名陷阱</h3>
                </div>

                <textarea
                    className="domain-editor"
                    placeholder={"malware-site.ru\nphishing-link.com"}
                />

                <div className="panel-footer">
      <span className="hint">
        域名将被重定向到本地回环 (0.0.0.0)。
      </span>

                    <button className="apply-button">
                        应用
                    </button>
                </div>

            </div>

        </div>, <section className="device-control  mb-item">

            <div className="section-title">
                <span className="device-icon"/>
                <h2>设备控制</h2>
            </div>


            <div className="device-config">

                <div className="device-group">
                    <label>
                        设备白名单 (MAC 地址)
                    </label>

                    <textarea
                        className="device-editor"
                        placeholder={"00:1A:2B:3C:4D:5E\nAA:BB:CC:DD:EE:FF"}
                    />
                </div>


                <div className="device-group">
                    <label>
                        设备黑名单 (MAC 地址)
                    </label>

                    <textarea
                        className="device-editor"
                        placeholder={"6E:D5:43:21:0A:9B"}
                    />
                </div>

            </div>


            <div className="device-footer">
                <button className="save-button">
                    保存配置
                </button>
            </div>

        </section>]
    }
}

export default Main
