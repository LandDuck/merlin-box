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

(function () {
    /**
     * 验证用户名,只能以字母开头,只能有字母数字下滑线,至少 N位 最多M位
     * @param N 至少 N 位
     * @param M 最多 M 位
     * @returns {boolean}
     */
    String.prototype.isUserName = function (N, M) {
        var regExpStr = '^[a-zA-Z]{1}([a-zA-Z0-9]|[_]){' + N + ',' + M + '}$'
        var regObj = new RegExp(regExpStr)
        return regObj.test(this)
    }

    /**
     * 验证密码,至少 N 位 最多M位
     * @param N 至少 N 位
     * @param M 最多 M 位
     * @returns {boolean}
     */
    String.prototype.isPassword = function (N, M) {
        var regExpStr = '^([a-zA-Z0-9]|[!@#$%^&*()_+]){' + N + ',' + M + '}$'
        var regObj = new RegExp(regExpStr)
        return regObj.test(this)
    }
})()
