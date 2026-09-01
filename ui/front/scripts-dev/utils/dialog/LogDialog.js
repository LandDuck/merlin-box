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

import DialogBase from "./DialogBase";

/**
 * InputDialog 用于弹出一个输入框， 让用户输入内容
 */
class LogDialog extends DialogBase {

    //当前的所有属性
    #props = null;

    //当前的配置
    #config = null;

    //获取定时器
    #timer = null;

    constructor(props) {
        super(props);
        this.#props = props;
        this.#config = props.config;
        //合并状态
        this.state = Object.assign(this.state, {
            content: ""
        });
    }

    /**
     * 组件卸载
     * 由DialogBase的componentWillUnmount接管并调用
     */
    onUnmount() {
        if (this.#timer) {
            clearInterval(this.#timer);
            this.#timer = null;
        }
    }

    /**
     * 第一次挂载后
     * 注意: 被DialogBase的componentDidMount接管并调用
     */
    onReady() {
        //检查 this.#config.content 是不是一个fun
        if (this.#config.content && typeof this.#config.content === "function") {
            clearInterval(this.#timer);
            this.#timer = setInterval(() => {
                let content = this.#config.content();
                if (content !== this.state.content) {
                    this.setState({
                        content: content
                    }, () => {
                        const contentContainer = $("#log-content").closest(".content");
                        contentContainer.scrollTop(contentContainer[0].scrollHeight);
                    });
                }
            }, 500);
        } else {
            this.setState({
                content: this.#config.content || ""
            });
        }
    }

    /**
     * 渲染
     * @returns
     */
    render() {
        return (<div className="ns-layer log-layer">
            <div className={`nlc ${this.state.show ? 'show' : ''}`}>
                <div className="nlc-inner">
                    <div className="title">
                        {this.#config.title}
                    </div>
                    <div className="content">
                        <div className="nlc-content" id="log-content" dangerouslySetInnerHTML={
                            {__html: this.state.content}
                        }>
                        </div>
                    </div>
                    <div className="btn">
                        <a href="#" className="btn btn-ok hover-btn" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!this.$helper.allowClick("ok-btn")) {
                                return;
                            }
                            let result = true;
                            if (this.#config.onOk) {
                                result = this.#config.onOk();
                            }
                            if (result !== false) {
                                this.$helper.closeLayer(null, true, this.#config._elId);
                            }
                        }}>
                            {
                                this.#config.okText ? this.#config.okText : "确定"
                            }
                        </a>
                    </div>
                </div>
            </div>
        </div>);
    }
}

export default LogDialog
