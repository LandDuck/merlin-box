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
 * StatusPanel
 */
class Status extends React.Component {

    //定义一个setTimeout的定时器
    #timer = null;

    //WebSocket 实例
    #ws = null;

    //日志变量（传给弹层的 getter 用）
    #log = "";

    /**
     * 构造方法
     * @param props
     */
    constructor(props) {
        super(props);
        this.state = {
            status: 0, //0未运行 1运行中
            runningTime: "",
            workingDir: "",
            domesticDelay: "--",
            internationalDelay: "--"
        };
    }

    /**
     * 第一次挂载后
     */
    componentDidMount() {
        this.#refreshStatus();
        this.#connectWS();
    }

    /**
     * 组件卸载
     */
    componentWillUnmount() {
        this.#stopTimer();
        this.#closeWS();
    }

    /**
     * 建立 WebSocket 连接
     */
    #connectWS() {
        const token = this.$storage.get(this.$storage.keys.token) || '';
        const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
        const url = `${protocol}://${location.host}/api/ws/log?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(url);

        ws.onmessage = (event) => {
            const line = (event.data || "")
                .replace(/\x1b\[[0-9;]*m/g, "")
                .replace(/\r\n|\r|\n/g, "<br/>");
            this.#log += line;
        };

        ws.onerror = (e) => {
            console.error("WebSocket error:", e);
        };
        ws.onclose = (e) => {
            console.log("WebSocket closed:", e);
        };
        ws.onopen = (e) => {
            console.log("WebSocket connected:", e);
        };
        this.#ws = ws;
    }

    /**
     * 关闭 WebSocket 连接
     */
    #closeWS() {
        if (this.#ws) {
            this.#ws.close();
            this.#ws = null;
        }
    }

    /**
     * 启动定时器
     */
    #startTimer() {
        this.#timer = setTimeout(() => {
            // 定时器逻辑
            this.#refreshStatus();
        }, 2000);
    }

    /**
     * 刷新状态
     */
    #refreshStatus() {
        this.$http.sendPost({
            url: this.$config.apis.comm_status,
            success: (status) => {
                //console.log("Status:", status);
                this.setState({
                    status: status.status,
                    runningTime: this.$helper.formatDuration(status.duration),
                    workingDir: status.workingDir,
                    domesticDelay: status.domesticDelay,
                    internationalDelay: status.internationalDelay
                });
                // 重新启动定时器
                this.#startTimer();
            }
        });
    }

    /**
     * 停止定时器
     */
    #stopTimer() {
        if (this.#timer) {
            clearTimeout(this.#timer);
            this.#timer = null;
        }
    }

    /**
     * 执行操作并展示日志弹层
     * @param {string} apiUrl  后台接口
     * @param {string} title   弹层标题
     */
    #runAction(apiUrl, title) {
        this.#log = "";
        this.$http.sendPost({
            url: apiUrl,
            success: () => {
                this.$helper.showLogLayer({
                    title,
                    okText: "关闭",
                    onOk: () => {
                    },
                    content: () => this.#log
                });
            }
        });
    }

    /**
     * 停止代理
     */
    #stop() {
        this.#runAction(this.$config.apis.comm_stop, "正在停止代理");
    }

    /**
     * 启动代理
     */
    #start() {
        this.#runAction(this.$config.apis.comm_start, "正在启动代理");
    }

    /**
     * 重启代理
     */
    #restart() {
        this.#runAction(this.$config.apis.comm_restart, "正在重启代理");
    }

    /**
     * 重启WEB UI服务
     */
    #restartUI() {
        let seconds = 5;
        this.$helper.showLoading(true, `正在重启WEB UI服务 ${seconds}`);
        this.$http.sendPost({
            url: this.$config.apis.comm_restartUI,
            success: () => {
                //5秒后刷新页面
                const m = setInterval(() => {
                    //location.reload();
                    seconds--;
                    $(".custom-loading .loading-text").html(`正在重启WEB UI服务 ${seconds}`);
                    if (seconds <= 0) {
                        location.reload();
                        clearInterval(m);
                    }
                }, 1000);
            }
        });
    }

    /**
     * 检查更新
     */
    #checkUpdate() {
        //this.#runAction(this.$config.apis.comm_checkUpdate, "正在检查更新");
    }

    /**
     * 更新规则
     */
    #updateRules() {
        this.#runAction(this.$config.apis.comm_updateRules, "正在更新规则");
    }

    /**
     * 渲染方法
     * @return
     */
    render() {
        return <div className="system-card mb-item">
            <div className="system-status">
                <div className="system-stat">
                    <div className="stat-label">运行时间</div>
                    {
                        this.state.status === 0 ? <div className="stat-value danger">未运行</div> : <div className="stat-value">{this.state.runningTime}</div>
                    }
                </div>
                <div className="system-stat">
                    <div className="stat-label">核心路径</div>
                    {
                        !this.state.workingDir || this.state.workingDir === "" ? <div className="stat-value status danger">
                            未配置
                        </div> : <div className="stat-value status" title={this.state.workingDir}>
                            {/*<span className="status-dot"/>*/}
                            {this.state.workingDir}
                        </div>
                    }
                </div>
                <div className="system-stat">
                    <div className="stat-label">版本</div>
                    <div className="stat-value">
                        {this.$config.data.version}
                    </div>
                </div>
                <div className="system-stat">
                    <div className="stat-label">国内延时</div>
                    <div className="stat-value speed">
                        {this.state.domesticDelay} ms
                    </div>
                </div>
                <div className="system-stat">
                    <div className="stat-label">国际延时</div>
                    <div className="stat-value speed">
                        {this.state.internationalDelay} ms
                    </div>
                </div>
            </div>
            <div className="system-actions">
                {
                    this.state.status === 0 ? <button className="btn-primary" onClick={(e) => {
                        this.#start();
                    }}>
                        <span className="icon-play"/>
                        启动代理
                    </button> : [
                        <button className="btn-secondary" key={"stop"} onClick={(e) => {
                            this.$helper.showAlertLayer({
                                title: "操作提示",
                                content: "确定要停止代理吗？",
                                onCancel: () => {
                                    this.$helper.warning("已取消停止代理");
                                },
                                onOk: () => {
                                    this.#stop();
                                }
                            });
                        }}>
                            <span className="icon-stop"/>
                            停止代理
                        </button>,
                        <button className="btn-secondary" key={"reboot"} onClick={(e) => {
                            this.$helper.showAlertLayer({
                                title: "操作提示",
                                content: "确定要重启代理吗？",
                                onCancel: () => {
                                    this.$helper.warning("已取消重启代理");
                                },
                                onOk: () => {
                                    this.#restart();
                                }
                            });
                        }}>
                            <span className="icon-reboot"/>
                            重启代理
                        </button>,
                        <button className="btn-secondary" key={"reboot-ui"} onClick={(e) => {
                            this.$helper.showAlertLayer({
                                title: "操作提示",
                                content: "确定要重启WEB UI服务吗？UI会断掉哦~",
                                onCancel: () => {
                                    this.$helper.warning("已取消重启WEB UI服务");
                                },
                                onOk: () => {
                                    this.#restartUI();
                                }
                            });
                        }}>
                            <span className="icon-reboot"/>
                            重启 WEB UI
                        </button>,
                        <button className="btn-secondary" key={"update-rules"} onClick={(e) => {
                            this.$helper.showAlertLayer({
                                title: "操作提示",
                                content: "确定要更新规则吗？",
                                onCancel: () => {
                                    this.$helper.warning("已取消更新规则");
                                },
                                onOk: () => {
                                    this.#updateRules();
                                }
                            });
                        }}>
                            <span className="icon-update"/>
                            更新规则
                        </button>
                    ]
                }
            </div>
        </div>
    }
}

export default Status
