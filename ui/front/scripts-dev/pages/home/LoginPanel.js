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
import Copyright from "../comm/Copyright";

/**
 * LoginPanel
 */
class LoginPanel extends React.Component {

    /**
     * 构造方法
     * @param props
     */
    constructor(props) {
        super(props);
        this.state = {
            pwdToggle: false,
            passwordError: false,
            usernameError: false,
            username: "",
            password: ""
        };
    }

    /**
     * 校验方法
     * @private
     */
    #check() {
        this.state.usernameError = !this.state.username.isUserName(3, 16);
        this.state.passwordError = !this.state.password.isPassword(6, 32);
        this.setState({
            usernameError: this.state.usernameError,
            passwordError: this.state.passwordError
        });
        if (this.state.usernameError || this.state.passwordError) {
            return false;
        }
        return true;
    }

    /**
     * 登录方法
     * @private
     */
    #login() {
        if (!this.#check()) {
            return;
        }
        this.$http.sendPost({
            url: this.$config.apis.comm_login,
            data: {
                username: this.state.username,
                password: this.state.password
            },
            success: (token) => {
                this.$storage.set(this.$storage.keys.token, token);
                this.$cookie.set(this.$cookie.keys.token, token, 7);
                this.$helper.success("登录成功")
                //调用外部回调
                if (this.props.onSuccess) {
                    this.props.onSuccess();
                }
            }
        });
    }

    /**
     * 第一次挂载后
     */
    componentDidMount() {

    }

    /**
     * 组件卸载
     */
    componentWillUnmount() {

    }

    /**
     * 渲染方法
     * @returns
     */
    render() {
        return <div className="login-card">
            <div className="login-header">
                <div className="login-title">
                    Merlin-box-UI
                </div>
                <div className="login-subtitle">
                    基于 ASUSWRT-Merlin 路由器环境的分流代理方案。
                </div>
            </div>
            <div className="login-form">
                <div className={`login-input ${this.state.usernameError ? "error" : ""}`}>
                    <span className="login-input-icon username-icon"/>
                    <input placeholder="Username" value={this.state.username} onChange={(e) => {
                        this.state.username = e.target.value.trim();
                        this.setState({
                            username: this.state.username
                        })
                        this.#check();
                    }} onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            this.#login();
                        }
                    }}/>
                </div>
                <div className={`login-input ${this.state.passwordError ? "error" : ""}`}>
                    <span className="login-input-icon password-icon"/>
                    <input placeholder="Password" type={this.state.pwdToggle ? "text" : "password"} value={this.state.password} onChange={(e) => {
                        this.state.password = e.target.value;
                        this.setState({
                            password: this.state.password
                        });
                        this.#check();
                    }} onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            this.#login();
                        }
                    }}/>
                    <span className={`password-toggle ${this.state.pwdToggle ? "showed" : ""}`} onClick={() => {
                        this.setState({
                            pwdToggle: !this.state.pwdToggle
                        });
                    }}/>
                </div>
                <button className="login-button" onClick={(e) => {
                    this.#login();
                    e.preventDefault();
                    e.stopPropagation();
                    /*this.$helper.showAlertLayer({
                        title: "提示",
                        content: "登录功能尚未实现，请联系管理员。"
                    })*/
                    /*this.$helper.showInputLayer({
                        title: "提示",
                        content: "登录功能尚未实现，请联系管理员。"
                    })*/
                    /*this.$helper.showLogLayer({
                        title: "提示",
                        content: "登录功能尚未实现，请联系管理员。"
                    })*/
                }}>
                    Login
                </button>
                <Copyright/>
            </div>
        </div>
    }
}

export default LoginPanel
