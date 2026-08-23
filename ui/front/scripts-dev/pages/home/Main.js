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

import Status from "./Status";
import NodeList from "./NodeList";
import DomainControl from "./DomainControl";
import DeviceControl from "./DeviceControl";
import IPControl from "./IPControl";
import BaseConfig from "./BaseConfig";
import Copyright from "../comm/Copyright";

/**
 * ManagerPanel
 */
class Main extends React.Component {

    /**
     * 构造方法
     * @param props
     */
    constructor(props) {
        super(props);
        this.state = {
            current: "base" //当前选中的 tab
        };
    }

    /**
     * 退出登录
     */
    #logout() {
        this.$http.sendPost({
            url: this.$config.apis.comm_logout,
            success: () => {
                //刷新页面
                window.location.reload();
            }
        });
    }

    /**
     * 修改密码
     */
    #changePassword() {
        this.$helper.showChangePwdLayer();
    }

    /**
     * 渲染方法
     * @returns
     */
    render() {
        //const status = <Status key={"status"}/>;
        //const nodeList = <NodeList key={"nodeList"}/>;
        //const baseConfig = <BaseConfig key={"baseConfig"}/>;
        //const domainControl = <DomainControl key={"domainControl"}/>;
        //const deviceControl = <DeviceControl key={"deviceControl"}/>;
        //const ip4Control = <IPControl key={"ip4Control"} title={"IPv4 控制"} version={"ipv4"} getConfigApi={this.$config.apis.comm_getIP4ControlConfig} saveConfigApi={this.$config.apis.comm_saveIP4ControlConfig}/>;
        //const ip6Control = <IPControl key={"ip6Control"} title={"IPv6 控制"} version={"ipv6"} getConfigApi={this.$config.apis.comm_getIP6ControlConfig} saveConfigApi={this.$config.apis.comm_saveIP6ControlConfig}/>;
        //const copyright = <Copyright key={"copyright"}/>;
        let content = null;
        switch (this.state.current) {
            case "base":
                content = <BaseConfig key={"baseConfig"}/>;
                break;
            case "node":
                content = <NodeList key={"nodeList"}/>;
                break;
            case "domain":
                content = <DomainControl key={"domainControl"}/>;
                break;
            case "ip4":
                content = <IPControl key={"ip4Control"} title={"IPv4 控制"} version={"ipv4"} getConfigApi={this.$config.apis.comm_getIP4ControlConfig} saveConfigApi={this.$config.apis.comm_saveIP4ControlConfig}/>;
                break;
            case "ip6":
                content = <IPControl key={"ip6Control"} title={"IPv6 控制"} version={"ipv6"} getConfigApi={this.$config.apis.comm_getIP6ControlConfig} saveConfigApi={this.$config.apis.comm_saveIP6ControlConfig}/>;
                break;
            case "device":
                content = <DeviceControl key={"deviceControl"}/>;
                break;
            default:
                content = <BaseConfig key={"baseConfig"}/>;
        }

        return <div className="tab-group">
            <div className="hero-header" key={"hero-header"}>
                <h1 className="hero-title">
                    Merlin-box-UI
                </h1>
                <p className="hero-description">
                    基于 ASUSWRT-Merlin 路由器环境的 sing-box + smartdns 分流代理脚本方案。
                </p>
                <a href="javascript:void(0);" className={"logout-btn change-pwd-btn"} onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.#changePassword();
                }}>修改密码</a>
                <a href="javascript:void(0);" className={"logout-btn"} onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.#logout();
                }}>退出登录</a>
            </div>
            <div className="tab-bar">
                <a href="javascript:void(0);" className={this.state.current === "base" ? "active" : ""} onClick={() =>
                    this.setState({current: "base"})
                }>基础配置</a>
                <a href="javascript:void(0);" className={this.state.current === "node" ? "active" : ""} onClick={() =>
                    this.setState({current: "node"})
                }>节点管理</a>
                <a href="javascript:void(0);" className={this.state.current === "domain" ? "active" : ""} onClick={() =>
                    this.setState({current: "domain"})
                }>域名控制</a>
                <a href="javascript:void(0);" className={this.state.current === "ip4" ? "active" : ""} onClick={() =>
                    this.setState({current: "ip4"})
                }>IPv4 控制</a>
                <a href="javascript:void(0);" className={this.state.current === "ip6" ? "active" : ""} onClick={() =>
                    this.setState({current: "ip6"})
                }>IPv6 控制</a>
                <a href="javascript:void(0);" className={this.state.current === "device" ? "active" : ""} onClick={() =>
                    this.setState({current: "device"})
                }>设备控制</a>
            </div>
            <Status key={"status"}/>
            <div className="tab-content">
                {content}
            </div>
            <Copyright key={"copyright"}/>
        </div>
    }
}

export default Main
