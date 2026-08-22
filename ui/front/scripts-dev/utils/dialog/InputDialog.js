/*
 * Copyright (C) 2026  LandDuck <https://github.com/LandDuck/>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import DialogBase from "./DialogBase";

/**
 * InputDialog 用于弹出一个输入框， 让用户输入内容
 */
class InputDialog extends DialogBase {

    //当前的所有属性
    #props = null;

    //当前的配置
    #config = null;

    constructor(props) {
        super(props);
        this.#props = props;
        this.#config = props.config;
        //合并状态
        this.state = Object.assign(this.state, {
            value: this.#config.value || "",
            error: false
        });
    }

    /**
     * 第一次挂载后
     * 注意: 被DialogBase的componentDidMount接管并调用
     */
    onReady() {

    }

    /**
     * 渲染
     * @return
     */
    render() {
        return (<div className="ns-layer input-layer">
            <div className={`nlc ${this.state.show ? 'show' : ''}`}>
                <div className="nlc-inner">
                    <div className="title">
                        {this.#config.title}
                    </div>
                    <div className="content">
                        <div className="nlc-content" dangerouslySetInnerHTML={
                            {__html: this.#config.content}
                        }>
                        </div>
                        <div className={`nlc-input ${this.state.error ? 'error' : ''}`}>
                            <input autoComplete="off" value={this.state.value} onChange={(e) => {
                                this.state.value = e.target.value;
                                let error = false;
                                if (this.#config.onCheck) {
                                    error = !this.#config.onCheck(this.state.value);
                                }
                                this.setState({
                                    value: this.state.value,
                                    error: error
                                });
                            }} type="text" placeholder={this.#config.placeholder || ""}/>
                        </div>
                    </div>
                    <div className="btn">
                        <a href="#" className="btn btn-cancel hover-btn" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!this.$helper.allowClick("cancel-btn")) {
                                return;
                            }
                            let result = true;
                            if (this.#config.onCancel) {
                                result = this.#config.onCancel();
                            }
                            if (result !== false) {
                                this.$helper.closeLayer(null, true, this.#config._elId);
                            }
                        }}>
                            {
                                this.#config.cancelText ? this.#config.cancelText : "取消"
                            }
                        </a>
                        <a href="#" className="btn btn-ok hover-btn" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!this.$helper.allowClick("ok-btn")) {
                                return;
                            }
                            let result = true;
                            if (this.#config.onOk) {
                                result = this.#config.onOk(this.state.value);
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

export default InputDialog
