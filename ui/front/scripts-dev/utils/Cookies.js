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

import Cookies from 'js-cookie'

/**
 * Cookies工具类
 */
class CookiesUtil {

    /**
     * @description 存储 cookie 值
     * @param {String} name cookie name
     * @param {String} value cookie value
     * @param {Object} setting cookie setting
     */
    set(name = 'default', value = '', setting = {}) {
        let currentCookieSetting = {
            expires: 1
        }
        let key = "mlb_" + name;
        Object.assign(currentCookieSetting, setting)
        Cookies.set(key, value, currentCookieSetting)
    }

    /**
     * @description 拿到 cookie 值
     * @param {String} name cookie name
     */
    get(name = 'default') {
        let key = "mlb_" + name;
        return Cookies.get(key)
    }

    /**
     * @description 删除 cookie
     * @param {String} name cookie name
     */
    remove(name = 'default') {
        let key = "mlb_" + name;
        return Cookies.remove(key)
    }

    /**
     * 保存所有的key
     * @type {{}}
     */
    keys = {
        signKey: "sign-key",
        token: "token",
        cipherText: "cipher-text"
    }
}

const cookies = new CookiesUtil();
export default cookies
