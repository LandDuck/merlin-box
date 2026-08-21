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
    }

    /**
     * 组件卸载
     */
    componentWillUnmount() {
        this.#stopTimer();
    }

    /**
     * 启动定时器
     */
    #startTimer() {
        this.#timer = setTimeout(() => {
            // 定时器逻辑
            this.#refreshStatus();
        }, 1000);
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
                        </div> : <div className="stat-value status">
                            {/*<span className="status-dot"/>*/}
                            {this.state.workingDir}
                        </div>
                    }
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
                    this.state.status === 0 ? <button className="btn-primary">
                        <span className="icon-play"/>
                        启动代理
                    </button> : [
                        <button className="btn-primary">
                            <span className="icon-play"/>
                            停止代理
                        </button>,
                        <button className="btn-secondary">
                            <span className="icon-reboot"/>
                            重启代理
                        </button>
                    ]
                }
            </div>
        </div>
    }
}

export default Status
