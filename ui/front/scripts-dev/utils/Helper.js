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
import './extend/string.js'
import AlertDialog from "./dialog/AlertDialog";
import InputDialog from "./dialog/InputDialog";
import LogDialog from "./dialog/LogDialog";
import ChangePwdDialog from "./dialog/ChangePwdDialog";
import AddNodeDialog from "./dialog/AddNodeDialog";
import {message} from 'antd';

/**
 * 全局工具类
 */
class Helper {

    /**
     * 构造方法
     */
    constructor(config) {
        //这个是为了防止按钮高频率点击
        this._mts = {};
        this._mtsMax = 500;
    }

    /**
     * 弹出添加节点弹窗
     * @param config
     */
    showAddNodeDialog(config) {
        if (config && config.dontCloseOther) {
            if (!config._elId) {
                config._elId = `ns-layer-out-${this.getUUid()}`;
            }
            let element = this.getLayerOutEle("ns-layer-out", config._elId);
            const root = window.createRoot(element);
            root.render(<AddNodeDialog config={config}/>);
            return;
        }
        this.closeLayer(() => {
            let element = this.getLayerOutEle();
            const root = window.createRoot(element);
            root.render(<AddNodeDialog config={config}/>);
        });
    }

    /**
     * 弹一个日志框
     * @param config
     */
    showLogLayer(config) {
        if (config && config.dontCloseOther) {
            if (!config._elId) {
                config._elId = `ns-layer-out-${this.getUUid()}`;
            }
            let element = this.getLayerOutEle("ns-layer-out", config._elId);
            const root = window.createRoot(element);
            root.render(<LogDialog config={config}/>);
            return;
        }
        this.closeLayer(() => {
            let element = this.getLayerOutEle();
            const root = window.createRoot(element);
            root.render(<LogDialog config={config}/>);
        });
    }


    /**
     * 弹出修改密码对话框
     */
    showChangePwdLayer() {
        const config = {};
        this.closeLayer(() => {
            let element = this.getLayerOutEle();
            const root = window.createRoot(element);
            root.render(<ChangePwdDialog config={config}/>);
        });
    }

    /**
     * 弹一个输入框
     * @param config
     */
    showInputLayer(config) {
        if (config && config.dontCloseOther) {
            if (!config._elId) {
                config._elId = `ns-layer-out-${this.getUUid()}`;
            }
            let element = this.getLayerOutEle("ns-layer-out", config._elId);
            const root = window.createRoot(element);
            root.render(<InputDialog config={config}/>);
            return;
        }
        this.closeLayer(() => {
            let element = this.getLayerOutEle();
            const root = window.createRoot(element);
            root.render(<InputDialog config={config}/>);
        });
    }

    /**
     * 弹一个通用的提示框
     * @param config
     */
    showAlertLayer(config) {
        console.log("showAlertLayer", config)
        if (config && config.dontCloseOther) {
            if (!config._elId) {
                config._elId = `ns-layer-out-${this.getUUid()}`;
            }
            let element = this.getLayerOutEle("ns-layer-out", config._elId);
            const root = window.createRoot(element);
            console.log("showAlertLayer1", config)
            root.render(<AlertDialog config={config}/>);
            return;
        }
        this.closeLayer(() => {
            let element = this.getLayerOutEle();
            const root = window.createRoot(element);
            console.log("showAlertLayer2", config)
            root.render(<AlertDialog config={config}/>);
        });
    }

    /**
     * getLayerOutEle
     * @param className
     * @param id
     * @returns {HTMLElement}
     */
    getLayerOutEle(className, id) {
        console.log("getLayerOutEle")
        if (!id) {
            id = "ns-layer-out";
        }
        let el = document.getElementById(id);
        if (!el) {
            console.log("没有ns-layer-out, 创建一个")
            el = document.createElement("div");
            el.id = id;
            $("#react-content").get(0).append(el)
            setTimeout(() => {
                $(el).addClass("show")
            }, 50);
        }
        if (className) {
            $(el).addClass(className);
        } else {
            let className = el.className;
            let arr = className.split(" ");
            for (let i = 0; i < arr.length; i++) {
                if (arr[i].indexOf("cus-") === 0) {
                    $(el).removeClass(arr[i]);
                }
            }
            /* $(el).removeClass(function (index, className) {
                 if (className.indexOf("cus-") === 0) {
                     console.log(className)
                     return className;
                 }
                 return null;
             });*/
        }
        return el;
    }

    /**
     * closeLayer
     * @param callback 关闭后的回调
     * @param deleteOutEl 是否删除外层元素
     * @param id 删除的id
     */
    closeLayer(callback, deleteOutEl, id) {
        console.log("closeLayer已被调用", id)
        if (!id) {
            id = "ns-layer-out";
        }
        let element = document.getElementById(id);
        if (element) {
            console.log("closeLayer存在原来的, 先尝试关闭再调用")
            $(element).find(".nlc").removeClass("show");
            //console.log($(element).find("nlc"))
            if (deleteOutEl) {
                $(element).removeClass("show");
            }
            setTimeout(() => {
                window.unmountRoot(element);
                if (deleteOutEl) {
                    element.remove();
                }
                if (callback) {
                    callback();
                }
            }, 110);
        } else {
            console.log("closeLayer直接回调")
            if (callback) {
                callback();
            }
        }
    }

    /**
     *
     */
    setTitle(title, addGlobalTitle) {
        if (addGlobalTitle === undefined) {
            addGlobalTitle = true;
        }
        console.log("setTitle", title, addGlobalTitle);
        $("title").html((title ? title + (addGlobalTitle ? " | " : "") : "") + (addGlobalTitle ? window.$config.data.webTitle : ""));
    }

    /**
     * getControllerName
     */
    getControllerName() {
        //console.log($("meta[name='controller']").attr("content"));
        return $("meta[name='controller']").attr("content");
    }

    /**
     * getActionName
     * @returns {*|jQuery}
     */
    getActionName() {
        //console.log($("meta[name='controller']").attr("content"));
        return $("meta[name='action']").attr("content");
    }

    /**
     * getParams
     */
    getParams() {
        return $("meta[name='params']").attr("content");
    }

    /**
     * formatNum 0->00 00->00
     */
    formatNum(num) {
        if (typeof (num) === "number") {
            let s = num.toString();
            if (s.length === 1) {
                return "0" + s;
            }
            return s.toString();
        }
        return num;
    }

    /**
     * copyObject
     */
    copyObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * getTimestamp
     * @returns {number}
     */
    getTimestamp() {
        return new Date().getTime();
    }

    /**
     * 将一个传入的 秒, 转换为 xx 天 xx小时 xx分钟 xx秒
     * 注意, 不足的情况下不显示前面的单位
     * @param seconds
     * @returns {string}
     */
    formatDuration(seconds) {
        //不使用moment.js, 直接计算
        let days = Math.floor(seconds / (24 * 3600));
        let hours = Math.floor((seconds % (24 * 3600)) / 3600);
        let minutes = Math.floor((seconds % 3600) / 60);
        let secs = seconds % 60;

        let result = '';
        if (days > 0) {
            result += days + '天';
        }
        if (hours > 0 || result) {
            result += hours + '小时';
        }
        if (minutes > 0 || result) {
            result += minutes + '分钟';
        }
        result += secs + '秒';

        return result;
    }

    /**
     * @param msg
     */
    success(msg) {
        //console.log("toast", msg)
        setTimeout(() => {
            message.success(msg);
        }, 60);
    }

    /**
     * @param msg
     */
    toast(msg) {
        //console.log("toast", msg)
        setTimeout(() => {
            message.warning(msg);
        }, 60);
    }

    /**
     * 显示错误
     * @param msg
     */
    error(msg) {
        console.log("error", msg)
        message.error(msg);
    }

    /**
     * 显示 warning
     */
    warning(msg) {
        message.warning(msg);
    }

    /**
     * loading
     * @param msg
     */
    loading(msg) {
        message.loading(msg);
    }

    /**
     * getUUid
     * @returns {string}
     */
    getUUid() {
        let s = []
        let hexDigits = '0123456789abcdef'
        for (let i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
        }
        s[14] = '4'  // bits 12-15 of the time_hi_and_version field to 0010
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1)  // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[8] = s[13] = s[18] = s[23] = '-'
        let uuid = s.join('')
        return uuid.toLowerCase()
    }

    /**
     * 从当前上下文环境中运行一个页面
     */
    runPage(params, count) {
        if (count >= 3) {
            return;
        }
        if (window.page) {
            window.page.main(params);
        } else {
            count++;
            setTimeout(() => {
                this.runPage(params, count)
            }, 100);
        }
    }

    /**
     * 加载一个页面
     * @param controller
     * @param action
     * @param params
     * @param count
     */
    loadPage(controller, action, params, count) {
        //console.log(count);
        if (count >= 5) {
            return;
        }
        let url = `${this.getBasePath()}scripts/pages/${controller}-${action}.js?v=${window.$config.data.version}`;
        $.ajax({
            cache: true,
            url: url,
            dataType: "script",
            success: () => {
                this.runPage(params, 0);
            },
            error: () => {
                this.loadPage("error", "404", params, ++count)
            }
        });
    }

    /**
     * getBasePath
     */
    getBasePath() {
        let path = $("body").attr("data-base");
        //console.log(path);
        if (!path) {
            path = "/"
        }
        return path;
    }

    /**
     * scrollTo
     */
    scrollTo(hash, count) {
        if (count === undefined) {
            count = -1;
        }
        let offset = $(hash).offset();
        if (offset !== $('body,html').scrollTop()) {
            if (offset) {
                $('body,html').animate({scrollTop: offset.top - 30}, 200);
            }
        }
        if (count >= 0 && count <= 2) {
            setTimeout(() => {
                this.scrollTo(hash, ++count)
            }, 300);
        }
    }


    /**
     * allowClick
     * @param name
     */
    allowClick(name) {
        let t = new Date().getTime();
        if (this._mts[name] && t - this._mts[name] < this._mtsMax) {
            return false;
        }
        this._mts[name] = t;
        return true;
    }

    /**
     * closeLoading
     */
    closeLoading() {
        $(".custom-loading").remove();
    }

    /**
     * 在屏幕中间显示一个自定义的loading
     * @param mask 有一个毛玻璃的背景
     * @param text 显示的文本, 目前不显示文本, 后续可以加上
     */
    showLoading(mask, text) {
        console.log("showLoading", mask);
        if ($(".custom-loading").length === 0) {
            let className = "custom-loading";
            if (mask) {
                className += " mask";
            }
            if (!text) {
                text = "加载中...";
            }
            $(".ns-content").append($(`<div class='${className}'>
        <div><span></span><span></span><span></span></div>
         <div>${text}</div>
</div>`));
            setTimeout(() => {
                $(".custom-loading").addClass("show")
            }, 70);
        }
    }

    /**
     * 获取当前年份
     */
    getCurrentYear() {
        return new Date().getFullYear()
    }

    /**
     *
     * @param url
     */
    urlContent(url) {
        let base = this.getBasePath();
        url = url.replace("~/", base);
        return url;
    }

    /**
     *
     * @param s
     * @returns {string}
     */
    urlEncode(s) {
        return encodeURIComponent(s);
    }

    /**
     * showUnknownError
     */
    showUnknownError() {
        this.toast("发生未知错误")
    }

}

export default Helper
