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

import React from "react" ;


class DialogBase extends React.Component {

    /**
     * 构造函数
     */
    constructor(props) {
        super(props);
        this.noDelayed = true; //不延迟, 可以在子类中设置, 关闭后在弹出前会显示...
        this.state = {
            show: false //是否显示
        }
    }

    /**
     * 第一次挂载后
     */
    componentDidMount() {
        //window.addEventListener("keyup", this.esc);
        //console.log(this.id,window.$lm)
        if (this.noDelayed) {
            setTimeout(() => {
                this.setState({
                    show: true
                });
                if (this.onReady) {
                    setTimeout(() => {
                        this.onReady();
                    }, 80);
                }
            }, 80);
            return;
        }
        if (this.id && window.$lm[this.id]) {
            setTimeout(() => {
                this.setState({
                    show: true
                });
                if (this.onReady) {
                    setTimeout(() => {
                        this.onReady();
                    }, 80);
                }
            }, 80);
        } else {
            this.$helper.showLoading();
            setTimeout(() => {
                this.$helper.closeLoading();
                this.setState({
                    show: true
                });
                if (this.id) {
                    window.$lm[this.id] = true;
                }

                if (this.onReady) {
                    setTimeout(() => {
                        this.onReady();
                    }, 80);
                }

            }, this.delay ? this.delay : 1200);
        }
    }

    /**
     * 卸载
     */
    componentWillUnmount() {
        //window.removeEventListener("keyup", this.esc);
        if (this.onUnmount) {
            this.onUnmount();
        }
    }
}

export default DialogBase
