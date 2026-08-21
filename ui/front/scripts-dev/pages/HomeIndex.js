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

import PageBase from "./comm/PageBase";
import Frame from "./comm/Frame";
import LoginPanel from "./home/LoginPanel";
import Main from "./home/Main";

class HomeLogin extends PageBase {

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.root = null;
    }

    /**
     * 渲染页面
     * @param comp 组件
     */
    render(comp) {
        if (this.root) {
            this.root.render(comp)
        }
    }

    /**
     * 主方法
     * @param params
     */
    main(params) {
        const domContainer = document.querySelector('#react-content');
        this.root = window.createRoot(domContainer);
        this.render(<Frame className="home-index" noInner={true}>
            <div className="lt-gradient"></div>
            <div className="rt-gradient"></div>
            <LoginPanel onSuccess={() => {
                this.render(<Frame className="home-main">
                    <div className="rt-gradient"></div>
                    <div className="lb-gradient"></div>
                    <Main/>
                </Frame>)
            }}/>
        </Frame>)
    }
}

window.page = new HomeLogin();
