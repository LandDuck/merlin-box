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
        this.state = {
            nodeList: []
        };
    }

    /**
     * 第一次挂载后
     */
    componentDidMount() {
        this.#loadNodeList();
    }

    /**
     * 组件卸载
     */
    componentWillUnmount() {

    }

    /**
     * 弹出添加节点弹窗
     */
    #addNode() {
        this.$helper.showAddNodeDialog({
            onOk: () => {
                this.#loadNodeList();
                return true;
            }
        });
    }

    /**
     * 加载节点列表
     */
    #loadNodeList() {
        this.$http.sendPost({
            url: this.$config.apis.comm_loadNodeList,
            success: (res) => {
                this.setState({
                    nodeList: res || []
                });
            }
        });
    }

    /**
     * 设为默认节点
     * @param {string} tag
     */
    #setDefault(tag) {
        this.$helper.showAlertLayer({
            title: "操作提示",
            content: "确认设为默认节点？",
            onCancel: () => {
                this.$helper.warning("已取消设为默认节点操作。");
            },
            onOk: () => {
                this.$http.sendPost({
                    url: this.$config.apis.comm_setDefaultNode,
                    data: {tag},
                    success: () => {
                        this.#loadNodeList();
                        this.$helper.warning("已设为默认节点，重启代理后生效。");
                    }
                });
            },
        });
    }

    /**
     * 删除节点
     * @param {string} tag
     */
    #deleteNode(tag) {
        this.$helper.showAlertLayer({
            title: "操作提示",
            content: "确认删除该节点？",
            onCancel: () => {
                this.$helper.warning("已取消删除节点操作。");
            },
            onOk: () => {
                this.$http.sendPost({
                    url: this.$config.apis.comm_deleteNode,
                    data: {tag},
                    success: () => {
                        this.$helper.success('删除成功');
                        this.#loadNodeList();
                    }
                });
            },
        });
    }

    /**
     * 编辑节点
     * @param tag
     */
    #editNode(tag) {
        this.$http.sendPost({
            url: this.$config.apis.comm_loadNode,
            data: {tag},
            success: (data) => {
                this.$helper.showAddNodeDialog({
                    data,
                    onOk: () => {
                        this.#loadNodeList();
                        return true;
                    }
                });
            }
        });
    }

    /**
     * 渲染单张节点卡片
     */
    #renderCard(node) {
        const isDefault = node.is_default === true;
        return <div key={node.tag} className={`node-card${isDefault ? ' node-active' : ''}`}>
            <div className="node-top">
                <div className={`node-icon${isDefault ? ' active' : ''}`}>
                    <span/>
                </div>
                <div className="tags">
                    {isDefault && <span className="node-tag">默认</span>}
                    {node.type && <span className="node-tag">{node.type}</span>}
                </div>
            </div>
            <div className="node-name">{node.name}</div>
            <div className="node-ip">{node.server}</div>
            {!isDefault ?  <div className="node-actions">
                <button className="node-action primary" onClick={() => this.#setDefault(node.tag)}>
                    设为默认
                </button>
                <button className="node-action primary" onClick={() => this.#editNode(node.tag)}>
                    编辑
                </button>
                <button className="node-action" onClick={() => this.#deleteNode(node.tag)}>
                    删除
                </button>
            </div> : <div className="node-actions">
                <button className="node-action primary" onClick={() => this.#editNode(node.tag)}>
                    编辑
                </button>
            </div>}
        </div>;
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
                {this.state.nodeList.map(node => this.#renderCard(node))}
                <div className="node-add" onClick={() => {
                    this.#addNode();
                }}>
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
