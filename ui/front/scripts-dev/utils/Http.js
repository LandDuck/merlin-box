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

import axios from 'axios'
import {message} from 'antd';

/**
 * 一个set的扩展
 * @constructor
 */
function Set() {

    /**
     * 集合元素的容器，以对象来表示
     * @type {Object}
     */
    let items = {}

    /**
     * 检测集合内是否有某个元素
     * @param  value  要检测的元素
     * @return {Boolean}    如果有，返回true
     */
    this.has = function (value) {
        return items.hasOwnProperty(value)
    }

    /**
     * 给集合内添加某个元素
     * @param  value  要被添加的元素
     * @return {Boolean}    添加成功返回True。
     */
    this.add = function (value) {
        //先检测元素是否存在。
        if (!this.has(value)) {
            items[value] = value
            return true
        }
        //如果元素已存在则返回false
        return false
    }

    /**
     * 移除集合中某个元素
     * @param  value  要移除的元素
     * @return {Boolean}    移除成功返回True。
     */
    this.remove = function (value) {
        //先检测元素是否存在。
        if (this.has(value)) {
            delete items[value]
            return true
        }
        //如果元素不存在，则删除失败返回false
        return false
    }

    /**
     * 清空集合
     */
    this.clear = function () {
        this.items = {}
    }

    /**
     * 返回集合长度，只可用于IE9及以上
     * @return {Number} 集合长度
     */
    this.size = function () {
        // Object.keys方法能将对象转化为数组
        // 只可用于IE9及以上，但很方便
        return Object.keys(items).length
    }

    /**
     * 返回集合长度，可用于所有浏览器
     * @return {Number} 集合长度
     */
    this.sizeLegacy = function () {
        let count = 0
        for (let prop in items) {
            if (items.hasOwnProperty(prop)) {
                ++count
            }
        }
        return count
    }

    /**
     * 返回集合转换的数组，只可用于IE9及以上
     * @return {Array} 转换后的数组
     */
    this.values = function () {
        return Object.keys(items)
    }

    /**
     * 返回集合转换的数组，可用于所有浏览器
     * @return {Array} 转换后的数组
     */
    this.valuesLegacy = function () {
        let keys = []
        for (let key in items) {
            keys.push(key)
        }

        return keys
    }

    /**
     * 返回两个集合的并集
     * @param {Set} otherSet 要进行并集操作的集合
     * @return {Set}     两个集合的并集
     */
    this.union = function (otherSet) {
        //初始化一个新集合，用于表示并集。
        let unionSet = new Set()
        //将当前集合转换为数组，并依次添加进unionSet
        let values = this.values()
        for (let i = 0; i < values.length; i++) {
            unionSet.add(values[i])
        }

        //将其它集合转换为数组，依次添加进unionSet。
        //循环中的add方法保证了不会有重复元素的出现
        values = otherSet.values()
        for (let i = 0; i < values.length; i++) {
            unionSet.add(values[i])
        }

        return unionSet
    }

    /**
     * 返回两个集合的交集
     * @param {Set} otherSet 要进行交集操作的集合
     * @return {Set}     两个集合的交集
     */
    this.intersection = function (otherSet) {
        //初始化一个新集合，用于表示交集。
        let interSectionSet = new Set()
        //将当前集合转换为数组
        let values = this.values()
        //遍历数组，如果另外一个集合也有该元素，则interSectionSet加入该元素。
        for (let i = 0; i < values.length; i++) {

            if (otherSet.has(values[i])) {
                interSectionSet.add(values[i])
            }
        }
        return interSectionSet
    }

    /**
     * 返回两个集合的差集
     * @param {Set} otherSet 要进行差集操作的集合
     * @return {Set}     两个集合的差集
     */
    this.difference = function (otherSet) {
        //初始化一个新集合，用于表示差集。
        let differenceSet = new Set()
        //将当前集合转换为数组
        let values = this.values()
        //遍历数组，如果另外一个集合没有该元素，则differenceSet加入该元素。
        for (let i = 0; i < values.length; i++) {

            if (!otherSet.has(values[i])) {
                differenceSet.add(values[i])
            }
        }

        return differenceSet
    }

    /**
     * 判断该集合是否为传入集合的子集
     * @param {Set} otherSet 传入的集合
     * @return {Boolean}   是则返回True
     */
    this.subset = function (otherSet) {
        // 第一个判定,如果该集合长度大于otherSet的长度
        // 则直接返回false
        if (this.size() > otherSet.size()) {
            return false
        } else {
            // 将当前集合转换为数组
            let values = this.values()

            for (let i = 0; i < values.length; i++) {

                if (!otherSet.has(values[i])) {
                    // 第二个判定。只要有一个元素不在otherSet中
                    // 那么则可以直接判定不是子集，返回false
                    return false
                }
            }

            return true
        }
    }
}

class Http {

    #loadingM = null;
    #loadingM2 = null;

    constructor() {

        //用来放置一个url集合
        this.set = new Set()

        //创建请求对象实例并配置
        this.instance = axios.create({
            //baseURL: config.apiUrl,  //基础的url
            //timeout: 10000 //超时时间
        })

        //一个拦截器, 在发请求前执行,  用来加入签名数据
        this.instance.interceptors.request.use(function (conf) {
            if (conf.method.toLowerCase() === 'post') {

                //let uid = window.$helper.getUUid()
                //let timestamp = window.$helper.getTimestamp()

                //决定全局签名
                //let sign = window.$helper.md5(window.$storage.get(window.$storage.keys.signKey) + '---' + timestamp + '---' + uid)
                //决定用户
                let token = window.$storage.get(window.$storage.keys.token)
                let cookieToken = window.$cookie.get(window.$cookie.keys.token);
                //优先使用cookie
                if (!token || token === "" || token !== cookieToken) {
                    token = cookieToken
                    window.$storage.set(window.$storage.keys.token, token);
                }

                //
                conf.headers.Authorization = token ? `Bearer ${token}` : ''

                //conf.headers.sign = sign
                //conf.headers.token = token ? token : ''
                //conf.headers.timestamp = timestamp
                //conf.headers.random = uid
                //conf.headers.ciphertext = window.$helper.urlEncode(window.$storage.get(window.$storage.keys.cipherText))
                //conf.headers.params = window.$helper.getParams()

            }
            return conf
        }, function (error) {
            return Promise.reject(error)
        })

        //拦截器, 请后调用, 在全局拦响应,  看响应码  以执行特定的操作
        this.instance.interceptors.response.use(function (response) {
            if (response != null && response.data != null && response.data.code !== 0) {
                switch (response.data.code) {
                    case 10010:  //需要登录
                        window.$storage.remove('token')
                        window.$storage.remove('uuid')
                        if (response.data.data) {
                            window.$helper.redirectSecurity('~/home/index?controller=' + response.data.data.controller + "&action=" + response.data.data.action, true)
                        } else {
                            window.$helper.redirect_home()
                            //window.location.replace("/")
                        }
                        break
                    case 10404:  //去404
                        window.$helper.redirectSecurity('~/error/404')
                        break
                    case 10302:  //去指定位置
                        if (response.data.msg && response.data.msg !== '') {
                            //先弹出
                            window.$helper.toast(response.data.msg)
                            //1.5秒后跳转
                            setTimeout(() => {
                                window.$helper.redirectSecurity(response.data.data)
                            }, 1500)
                        } else {
                            window.$helper.redirectSecurity(response.data.data)
                        }
                        break
                    case 11302:  //去指定位置
                        if (response.data.msg && response.data.msg !== '') {
                            //先弹出
                            window.$helper.toast(response.data.msg)
                            //1.5秒后跳转
                            setTimeout(() => {
                                window.$helper.redirectSecurity(response.data.data, true)
                            }, 1500)
                        } else {
                            window.$helper.redirectSecurity(response.data.data, true)
                        }
                        break
                    case 10400:  //去首页
                        window.$helper.redirectSecurity('~/')
                        break
                    case -1:
                        return response
                    default:
                        //console.log(response);
                        /*if (response.config.showError) {
                          eui.Message.error(response.data.msg)
                        }*/
                        break
                }
            }
            return response
        }, function (error) {
            window.$helper.toast("请求出现错误:" + error);
            //关闭loading
            message.destroy("loading")
        })
    }

    /**
     * addUrlToSet
     * @param url
     */
    addUrlToSet(url) {
        if (this.set.has(url)) {
            return
        }
        this.set.add(url)
        setTimeout(() => {
            this.set.remove(url)
        }, 400)
    }

    /**
     * closeLoading
     * @param callback
     */
    closeLoading(callback) {
        clearTimeout(this.#loadingM)
        message.destroy("loading");
        if (callback) {
            this.#loadingM2 = setTimeout(() => {
                callback();
            }, 50);
        } else {
            clearTimeout(this.#loadingM2)
        }
    }

    /**
     * sendPost
     * @param params
     * @param params.url 请求的url
     * @param params.data 请求的数据
     * @param params.success 成功后的调用
     * @param params.fail 失败后的调用
     * @param params.completed 完成后的调用(不管是否成功失败)
     * @param params.enableSign 启用参数签名
     * @param params.count 请求的次数
     * @param params.autoLoading 默认显示一个没有文字的loading, 会延时显示
     * @param params.loadingText 设置了这个, 会显示出有文字的loading
     * @param params.count 请求的次数
     * */
    sendPost(params) {

        //console.log("sendPost", params)
        //处理参数
        let url = params.url || "" //请求的url
        let data = params.data || {} //请求的数据
        let callback = params.success //成功后的调用
        let failCallback = params.fail //失败后的调用
        let completedCallback = params.completed //完成后的调用(不管是否成功失败)
        let enableSign = params.enableSign || true //启用参数签名
        let count = params.count || 0 //请求的次数
        let loadingText = params.loadingText //设置了这个, 会显示出有文字的loading
        let showLoading = params.autoLoading || true //默认显示一个没有文字的loading, 会延时显示
        url = url.toLowerCase()

        if (count >= 10) {
            window.$helper.toast("重试达到上限" + url)
            return
        }

        if (!window.httpOk && url.indexOf("api/init") === -1) {
            //未ok,等待
            console.log("等待初始化网络");
            setTimeout(() => {
                params.count = count + 1
                this.sendPost(params)
            }, 200)
            return;
        }

        //当前对象
        let thisObj = this
        //用来限制短时间内同一接口访问次数
        if (this.set.has(url) && url.indexOf("api/init") === -1) {
            return
        }
        this.addUrlToSet(url)

        if (loadingText) {
            //loading层
            console.log("loadingText", loadingText)
            this.closeLoading(() => {
                message.loading({
                    content: loadingText,
                    key: 'loading',
                    duration: 0
                });
            })
        } else {
            if (showLoading) {
                this.closeLoading(() => {
                    this.#loadingM = setTimeout(() => {
                        //隐藏掉处理中
                        // message.loading({
                        //     content: '处理中...',
                        //     key: 'loading',
                        //     duration: 2
                        // });
                    }, 250)
                })
            }
        }

        data._mt = new Date().getTime()
        if (enableSign) {
            //排序参数
            let array = []
            //扫一下加入key, 同时, 去掉\n\r
            for (let key in data) {
                if (data.hasOwnProperty(key)) {
                    if (data[key] == null) {
                        data[key] = ''
                    }
                    array.push(key)
                    if (typeof (data[key]) == 'string') {
                        data[key] = data[key].trim()
                    }
                }
            }
            array.sort() //正排序
            //拼接
            let str = ''
            for (let i = 0; i < array.length; i++) {
                if (array[i] === 'signature' || array[i].indexOf('Time') !== -1 || array[i].indexOf('Date') !== -1) {
                    continue
                }
                let val = ''
                if (Array.isArray(data[array[i]]) || typeof (data[array[i]]) === 'object') {
                    val = JSON.stringify(data[array[i]])
                } else {
                    val = data[array[i]].toString()
                }
                if (val.length <= 50) {
                    str += array[i] + val
                }
            }
            //str = str.toLowerCase()
            //加入签名
            data.signature = window.$helper.md5(window.$storage.get(window.$storage.keys.signKey) + '---' + str)
            //console.log(data.signature);
            //console.log(str);
            //console.log(window.$storage.get(window.$storage.keys.signKey) + '---' + str);
        }

        let baseUrl = window.$config.data.apiUrl;
        let requestUrl = baseUrl + url;

        //检测requestUrl中是否存在queryString
        if (params.count > 0) {
            if (requestUrl.indexOf("?") !== -1) {
                requestUrl = requestUrl + "&_n=" + params.count;
            } else {
                requestUrl = requestUrl + "?_n=" + params.count;
            }
        }

        //console.log("sendPost", requestUrl, data, params.count)

        this.instance.post(requestUrl, data, {
            showError: !failCallback
        }).then(function (response) {

            thisObj.closeLoading();

            if (completedCallback) {
                completedCallback();
            }
            if (response != null && response.status === 200 && response.data != null) {
                if (response.data.code === -1) {
                    window.$storage.set(window.$storage.keys.signKey, response.data.data.key)
                    window.$storage.set(window.$storage.keys.cipherText, response.data.data.ciphertext)
                    window.httpOk = true;
                    params.count = count + 1
                    thisObj.sendPost(params)
                    return
                }
                if (response.data.code === 10005) {
                    window.$storage.set(window.$storage.keys.signKey, "")
                    window.$storage.set(window.$storage.keys.cipherText, "")
                    //console.log("签名错误, 继续请求", params);
                    params.count = count + 1
                    thisObj.sendPost(params)
                    return
                }
                if (response.data.code === 0 && callback) {
                    callback(response.data.data)
                } else if (failCallback) {
                    let r = failCallback(response.data)
                    if (!r) {
                        window.$helper.toast(response.data.msg);
                    }
                } else {
                    if (response.data && response.data.msg && response.data.msg !== "") {
                        window.$helper.toast(response.data.msg);
                    }
                    //eui.Message.error(response.data.msg)
                }
            }
        })
    }


}

export default Http
