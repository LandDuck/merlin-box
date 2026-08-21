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
 * NodeList
 */
class NodeList extends React.Component {

    /**
     * 构造方法
     * @param props
     */
    constructor(props) {
        super(props);
    }

    /**
     * 渲染方法
     * @return
     */
    render() {
        return <section className="node-network  mb-item">
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
        </section>
    }
}

export default NodeList
