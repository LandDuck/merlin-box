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

import Helper from "./utils/Helper";
import Http from "./utils/Http";
import Config from "./utils/Config";
import cookies from "./utils/Cookies";
import storage from "./utils/Storage";
import $ from "jquery";
import ReactDOM from "react-dom"
import {createRoot} from 'react-dom/client';
import React from "react"

window.$ = $;
window.ReactDOM = ReactDOM;
window.createRoot = createRoot;
window.React = React;

import {Switch} from 'antd';
import {Select} from 'antd';

window.antd={};
window.antd.Switch = Switch;
window.antd.Select = Select;

/**
 * 加载页面
 * @param helper
 * @param action
 */
function loadPage(helper, action) {
    //获取执行参数
    let controller = "home";
    if (!controller || !action || controller === '' || action === '') {
        controller = "error";
        action = "404";
    }
    //加载pageJs并执行
    helper.loadPage(controller, action, "", 0);
}

/**
 * 主函数
 */
function main() {

    //这个东西保存弹出的layer， 如果被弹过， 这里就会存在， 不再使用加载效果
    window.$lm = {};
    //window.$APlayer = APlayer;

    //全局通用工具类及配置
    let config = new Config();
    window.$config = config;
    React.Component.prototype.$config = config;

    window.$cookie = cookies;
    React.Component.prototype.$cookie = cookies;

    window.$storage = storage;
    React.Component.prototype.$storage = storage;

    let helper = new Helper();
    window.$helper = helper;
    React.Component.prototype.$helper = helper;

    let http = new Http();
    window.$http = http;
    React.Component.prototype.$http = http;

    //全局初始化
    http.sendPost({
        url: config.apis.comm_init,
        success: (data) => {
            window.httpOk = true;
            if (data === 1) {
                loadPage(helper, "main");
                //已经登录
                window.loggedIn = true;
                return
            }
            loadPage(helper, "index");
        }
    });
}

$(document).ready(function () {
    main();
});

