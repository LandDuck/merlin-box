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
 * ChangePwdDialog 修改密码弹窗，包含旧密码/新密码/确认密码三个输入框，
 * 内置格式校验、两次密码一致性校验、提交前二次确认以及 HTTP 提交。
 */
class ChangePwdDialog extends DialogBase {

    #props = null;
    #config = null;

    constructor(props) {
        super(props);
        this.#props = props;
        this.#config = props.config || {};
        this.state = Object.assign(this.state, {
            oldPassword: "",
            newPassword: "",
            confirmPassword: "",
            oldPasswordError: false,
            newPasswordError: false,
            confirmPasswordError: false,
        });
    }

    onReady() {
    }

    /**
     * 校验三个字段，返回 true 表示全部合法，否则更新各自的 error 状态并返回 false
     */
    #validate() {
        const {oldPassword, newPassword, confirmPassword} = this.state;

        const oldPasswordError = !oldPassword || !oldPassword.isPassword(6, 32);
        const newPasswordError = !newPassword || !newPassword.isPassword(6, 32);
        const confirmPasswordError = !confirmPassword || confirmPassword !== newPassword;

        this.setState({oldPasswordError, newPasswordError, confirmPasswordError});
        return !oldPasswordError && !newPasswordError && !confirmPasswordError;
    }

    render() {
        const {
            oldPassword, newPassword, confirmPassword,
            oldPasswordError, newPasswordError, confirmPasswordError
        } = this.state;

        return (<div className="ns-layer change-pwd-layer">
            <div className={`nlc ${this.state.show ? 'show' : ''}`}>
                <div className="nlc-inner">
                    <div className="title">修改登录密码</div>
                    <div className="cpd-rows">

                        {/* 旧密码 */}
                        <div className="cpd-row">
                            <div className="cpd-label">旧密码</div>
                            <div className={`cpd-input ${oldPasswordError ? 'error' : ''}`}>
                                <input
                                    autoComplete="new-password"
                                    type="password"
                                    placeholder="请输入当前密码"
                                    value={oldPassword}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        this.setState({
                                            oldPassword: v,
                                            oldPasswordError: v.length > 0 && !v.isPassword(6, 32),
                                        });
                                    }}
                                />
                            </div>
                        </div>

                        {/* 新密码 */}
                        <div className="cpd-row">
                            <div className="cpd-label">新密码</div>
                            <div className={`cpd-input ${newPasswordError ? 'error' : ''}`}>
                                <input
                                    autoComplete="new-password"
                                    type="password"
                                    placeholder="6~32位，支持字母、数字及常用符号"
                                    value={newPassword}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        this.setState({
                                            newPassword: v,
                                            newPasswordError: v.length > 0 && !v.isPassword(6, 32),
                                            // 同步重校验确认密码（若用户已填写）
                                            confirmPasswordError: confirmPassword.length > 0 && confirmPassword !== v,
                                        });
                                    }}
                                />
                            </div>
                        </div>

                        {/* 确认新密码 */}
                        <div className="cpd-row">
                            <div className="cpd-label">确认密码</div>
                            <div className={`cpd-input ${confirmPasswordError ? 'error' : ''}`}>
                                <input
                                    autoComplete="new-password"
                                    type="password"
                                    placeholder="请再次输入新密码"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        this.setState({
                                            confirmPassword: v,
                                            confirmPasswordError: v.length > 0 && v !== newPassword,
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
                            if (!this.$helper.allowClick("cpd-cancel-btn")) {
                                return;
                            }
                            this.$helper.closeLayer(null, true, this.#config._elId);
                        }}>取消</a>
                        <a href="#" className="btn btn-ok hover-btn" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!this.$helper.allowClick("cpd-ok-btn")) {
                                return;
                            }
                            if (!this.#validate()) {
                                this.$helper.error("请检查输入：密码格式不正确或两次密码不一致。");
                                return;
                            }
                            // 记录当前值，showAlertLayer 会替换本弹窗
                            const oldPwd = this.state.oldPassword;
                            const newPwd = this.state.newPassword;
                            this.$helper.showAlertLayer({
                                title: "操作提示",
                                content: "您确定要修改登录密码吗？",
                                onCancel: () => {
                                    this.$helper.warning("已取消修改密码操作。");
                                },
                                onOk: () => {
                                    this.$http.sendPost({
                                        url: this.$config.apis.comm_changePassword,
                                        data: {
                                            old_password: oldPwd,
                                            password: newPwd,
                                        },
                                        success: () => {
                                            this.$helper.success("密码修改成功。");
                                        },
                                    });
                                },
                            });
                        }}>修改密码</a>
                    </div>
                </div>
            </div>
        </div>);
    }
}

export default ChangePwdDialog
