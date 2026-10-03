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
 * SubscriptionDialog 添加/编辑订阅弹窗，包含订阅名称、订阅链接两个必填项，
 * guid 为隐藏字段：新增时自动生成，编辑时由 config.data 回显。
 */
class SubscriptionDialog extends DialogBase {

    #config = null;

    constructor(props) {
        super(props);
        this.#config = props.config || {};
        const data = this.#config.data || {};
        this.state = Object.assign(this.state, {
            guid: data.guid || this.$helper.getUUid(),
            name: data.name || "",
            link: data.link || "",
            nameError: false,
            linkError: false,
        });
    }

    onReady() {
    }

    #isValidLink(link) {
        try {
            const u = new URL(link);
            return (u.protocol === "http:" || u.protocol === "https:") && !!u.hostname;
        } catch (e) {
            return false;
        }
    }

    #validate() {
        const name = this.state.name.trim();
        const link = this.state.link.trim();
        const nameError = !name;
        const linkError = !link || !this.#isValidLink(link);
        this.setState({nameError, linkError});
        return !nameError && !linkError;
    }

    #submit() {
        const {guid, name, link} = this.state;
        this.$http.sendPost({
            url: this.$config.apis.comm_saveSubscription,
            data: {guid, name: name.trim(), link: link.trim()},
            success: () => {
                this.$helper.success("订阅保存成功。");
                if (typeof this.#config.onOk === "function") {
                    this.#config.onOk();
                }
                this.$helper.closeLayer(null, true, this.#config._elId);
            },
        });
    }

    render() {
        const {name, link, nameError, linkError} = this.state;
        const isEdit = !!(this.#config.data && this.#config.data.guid);

        return (<div className="ns-layer change-pwd-layer subscription-layer">
            <div className={`nlc ${this.state.show ? 'show' : ''}`}>
                <div className="nlc-inner">
                    <div className="title">{isEdit ? "编辑订阅" : "添加订阅"}</div>
                    <div className="cpd-rows">
                        <div className="cpd-row">
                            <div className="cpd-label">订阅名称</div>
                            <div className={`cpd-input ${nameError ? 'error' : ''}`}>
                                <input
                                    type="text"
                                    placeholder="请输入订阅名称"
                                    value={name}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        this.setState({name: v, nameError: !v.trim()});
                                    }}
                                />
                            </div>
                        </div>
                        <div className="cpd-row">
                            <div className="cpd-label">订阅链接</div>
                            <div className={`cpd-input ${linkError ? 'error' : ''}`}>
                                <input
                                    type="text"
                                    placeholder="请输入 http(s):// 开头的订阅链接"
                                    value={link}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        this.setState({
                                            link: v,
                                            linkError: !v.trim() || !this.#isValidLink(v.trim()),
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="btn">
                        <a href="#" className="btn btn-cancel hover-btn" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!this.$helper.allowClick("sub-cancel-btn")) {
                                return;
                            }
                            this.$helper.closeLayer(null, true, this.#config._elId);
                        }}>取消</a>
                        <a href="#" className="btn btn-ok hover-btn" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!this.$helper.allowClick("sub-ok-btn")) {
                                return;
                            }
                            if (!this.#validate()) {
                                this.$helper.error("请检查输入：订阅名称不能为空，订阅链接需为合法的 http(s) 链接。");
                                return;
                            }
                            this.#submit();
                        }}>保存</a>
                    </div>
                </div>
            </div>
        </div>);
    }
}

export default SubscriptionDialog
