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
 * Http
 */
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
                //决定用户
                let token = window.$storage.get(window.$storage.keys.token)
                let cookieToken = window.$cookie.get(window.$cookie.keys.token);
                //优先使用cookie
                if (!token || token === "" || token !== cookieToken) {
                    token = cookieToken
                    window.$storage.set(window.$storage.keys.token, token);
                }
                conf.headers.Authorization = token ? `Bearer ${token}` : ''
            }
            return conf
        }, function (error) {
            return Promise.reject(error)
        })

        //拦截器, 请后调用, 在全局拦响应,  看响应码  以执行特定的操作
        this.instance.interceptors.response.use(function (response) {
            if (response != null && response.data != null && response.data.code !== 0) {
                switch (response.data.code) {
                    case 10014:
                        //需要登录
                        window.$storage.remove(window.$storage.keys.token)
                        window.$cookie.remove(window.$cookie.keys.token)
                        //刷新页面
                        window.location.reload()
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
            this.set.delete(url)
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

        //处理参数
        let url = params.url || "" //请求的url
        let data = params.data || {} //请求的数据
        let callback = params.success //成功后的调用
        let failCallback = params.fail //失败后的调用
        let completedCallback = params.completed //完成后的调用(不管是否成功失败)
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
