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
 * SubscriptionList
 */
class SubscriptionList extends React.Component {

    /**
     * 构造方法
     * @param props
     */
    constructor(props) {
        super(props);
        this.state = {
            subscriptionList: []
        };
    }

    /**
     * 第一次挂载后
     */
    componentDidMount() {
        this.#loadSubscriptionList();
    }

    /**
     * 组件卸载
     */
    componentWillUnmount() {

    }

    /**
     * 弹出添加订阅弹窗
     */
    #addSubscription() {
        this.$helper.showAddSubscriptionDialog({
            onOk: () => {
                this.#loadSubscriptionList();
                return true;
            }
        });
    }

    /**
     * 加载订阅列表
     */
    #loadSubscriptionList() {
        this.$http.sendPost({
            url: this.$config.apis.comm_loadSubscriptionList,
            success: (res) => {
                this.setState({
                    subscriptionList: res || []
                });
            }
        });
    }


    /**
     * 删除订阅
     * @param {string} guid
     */
    #deleteSubscription(guid) {
        this.$helper.showAlertLayer({
            title: "操作提示",
            content: "确认删除该订阅？对应的节点也会一并删除，请确认！",
            onCancel: () => {
                this.$helper.warning("已取消删除操作。");
            },
            onOk: () => {
                this.$http.sendPost({
                    url: this.$config.apis.comm_deleteSubscription,
                    data: {
                        guid
                    },
                    success: () => {
                        this.$helper.success('删除成功');
                        this.#loadSubscriptionList();
                    }
                });
            },
        });
    }

    /**
     * 编辑订阅
     * @param guid
     */
    #editSubscription(guid) {
        this.$http.sendPost({
            url: this.$config.apis.comm_loadSubscription,
            data: {
                guid: guid
            },
            success: (data) => {
                this.$helper.showAddSubscriptionDialog({
                    data,
                    onOk: () => {
                        this.#loadSubscriptionList();
                        return true;
                    }
                });
            }
        });
    }

    /**
     * 更新订阅节点
     * @param guid
     */
    #updateSubscriptionNodes(guid) {
        this.$helper.toast("功能还在开发中，敬请期待！");
    }

    /**
     * 渲染方法
     * @return
     */
    render() {
        return <section className="subscription-list mb-item">
            <div className="subscription-header">
                <div className="subscription-title">
                    <span className="title-icon"></span>
                    <span className="title-text">节点订阅</span>
                </div>
                <button className="add-subscription" onClick={() => this.#addSubscription()}>
                    <span className="icon"></span>
                    <span>添加订阅</span>
                </button>
            </div>
            <div className="subscription-table">
                <div className="table-header">
                    <div className="col-index">序号</div>
                    <div className="col-name">名称</div>
                    <div className="col-url">链接</div>
                    <div className="col-actions">操作</div>
                </div>
                <div className="table-body">
                    {(!this.state.subscriptionList || this.state.subscriptionList.length === 0)
                        ? <div className="subscription-empty">
                            暂无订阅
                        </div>
                        : this.state.subscriptionList.map((item, index) =>
                            <div className="subscription-item" key={item.guid}>
                                <div className="col-index">{String(index + 1).padStart(2, '0')}</div>
                                <div className="col-name">
                                    <span className="name">{item.name}</span>
                                </div>
                                <div className="col-url">
                                    <span className="url" title={item.link}>{item.link}</span>
                                </div>
                                <div className="col-actions">
                                    <div className="actions">
                                        <button className="action update" onClick={() => this.#updateSubscriptionNodes(item.guid)}>
                                            <span className="icon"></span>
                                            <span>更新</span>
                                        </button>
                                        <button className="action edit"
                                                onClick={() => this.#editSubscription(item.guid)}>
                                            <span className="icon"></span>
                                            <span>编辑</span>
                                        </button>
                                        <button className="action delete"
                                                onClick={() => this.#deleteSubscription(item.guid)}>
                                            <span className="icon"></span>
                                            <span>删除</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    {/*<div className="subscription-item">
                        <div className="col-index">01</div>
                        <div className="col-name">
                            <span className="name">HK-Special-HighSpeedHK-Special-HighSpeedHK-Special-HighSpeed</span>
                        </div>
                        <div className="col-url">
                              <span className="url" title="https://sub.stellaros.io/v1/sub?token=7f90c3ae4b29">
                                https://sub.stellaros.io/v1/sub?token=7f90c3ae4b29https://sub.stellaros.io/v1/sub?token=7f90c3ae4b29https://sub.stellaros.io/v1/sub?token=7f90c3ae4b29
                              </span>
                        </div>
                        <div className="col-actions">
                            <div className="actions">
                                <button className="action update">
                                    <span className="icon"></span>
                                    <span>更新</span>
                                </button>
                                <button className="action edit">
                                    <span className="icon"></span>
                                    <span>编辑</span>
                                </button>
                                <button className="action delete">
                                    <span className="icon"></span>
                                    <span>删除</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="subscription-item">
                        <div className="col-index">02</div>
                        <div className="col-name">
                            <span className="name">Tokyo-Gaming-Relay</span>
                        </div>
                        <div className="col-url">
                          <span className="url">
                            https://sub.stellaros.io/
                          </span>
                        </div>
                        <div className="col-actions">
                            <div className="actions">
                                <button className="action update">
                                    <span className="icon"></span>
                                    <span>更新</span>
                                </button>
                                <button className="action edit">
                                    <span className="icon"></span>
                                    <span>编辑</span>
                                </button>
                                <button className="action delete">
                                    <span className="icon"></span>
                                    <span>删除</span>
                                </button>
                            </div>
                        </div>
                    </div>*/}
                </div>
            </div>
        </section>
    }
}

export default SubscriptionList
