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

import Apis from "./Apis";

/**
 * 全局配置类
 */
class Config {
    /**
     * 全局配置类
     */
    constructor() {
        this.apis = Apis
        let apiUrl = "http://127.0.0.1:65006/";  //正式地址
        /*if (IS_DEV) {
            apiUrl = "http://retail.tencentads.com/webapi/";//开发地址
        }
        if (IS_TEST) {
            apiUrl = "https://edutest.retail.tencent.com/webapi/";//测试地址
        }*/
        this.data = {
            version: "20260724",
            apiUrl: apiUrl
        }
    }
}

export default Config
