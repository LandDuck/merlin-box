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

    /**
     * 校验 IPv4
     * @returns {boolean}
     */
    String.prototype.isIPv4 = function () {
        var value = (this || "").trim()
        var parts = value.split(".")
        if (parts.length !== 4) {
            return false
        }
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i]
            if (!/^\d{1,3}$/.test(part)) {
                return false
            }
            var num = Number(part)
            if (num < 0 || num > 255) {
                return false
            }
            if (part.length > 1 && part.charAt(0) === "0") {
                return false
            }
        }
        return true
    }

    /**
     * 校验 IPv6
     * @returns {boolean}
     */
    String.prototype.isIPv6 = function () {
        var value = (this || "").trim()
        return /^(([0-9a-fA-F]{1,4}:){7}([0-9a-fA-F]{1,4}|:)|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/.test(value)
    }

    /**
     * 校验域名
     * @returns {boolean}
     */
    String.prototype.isDomain = function () {
        var value = (this || "").trim()
        if (!/^[a-zA-Z0-9.-]+$/.test(value)) {
            return false
        }
        if (value.length > 253 || value.indexOf(".") === 0 || value.charAt(value.length - 1) === ".") {
            return false
        }
        var labels = value.split(".")
        for (var i = 0; i < labels.length; i++) {
            var label = labels[i]
            if (!label || label.length > 63) {
                return false
            }
            if (label.indexOf("-") === 0 || label.charAt(label.length - 1) === "-") {
                return false
            }
        }
        return true
    }

    /**
     * 校验主机地址 (IPv4 / IPv6 / 域名)
     * @returns {boolean}
     */
    String.prototype.isHost = function () {
        var value = (this || "").trim()
        return value.isIPv4() || value.isIPv6() || value.isDomain()
    }

    /**
     * 校验端口范围 1 ~ 65535
     * @returns {boolean}
     */
    String.prototype.isPort = function () {
        var value = (this || "").trim()
        if (!/^\d+$/.test(value)) {
            return false
        }
        var port = Number(value)
        return Number.isInteger(port) && port >= 1 && port <= 65535
    }
})()
