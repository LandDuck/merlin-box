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

import DialogBase from "./DialogBase";
import ShadowsocksForm from "./ShadowsocksForm";
import VmessForm from "./VmessForm";
import VlessForm from "./VlessForm";
import TrojanForm from "./TrojanForm";
import NaiveForm from "./NaiveForm";
import WireguardForm from "./WireguardForm";
import Hysteria2Form from "./Hysteria2Form";
import TuicForm from "./TuicForm";
import AnytlsForm from "./AnytlsForm";
import SnellForm from "./SnellForm";

/**
 * AddNodeDialog 添加节点弹窗，包含各种节点的输入框， tab 切换，节点类型选择，节点参数输入等，
 * 内置格式校验、提交前二次确认以及 HTTP 提交。
 */
class AddNodeDialog extends DialogBase {

    #props = null;
    #config = null;
    // 当前表单
    #form = null;

    /**
     * 构造方法
     * @param props
     */
    constructor(props) {
        super(props);
        this.#props = props;
        this.#config = props.config || {};
        let current = "naive";
        if (this.#config.data) {
            current = this.#config.data.type || "naive";
        }
        this.state = Object.assign(this.state, {
            current: current //当前选中的节点类型
        });
    }

    /**
     * 组件挂载后
     */
    onReady() {
    }

    /**
     * 提交表单数据
     */
    #submit() {
        if (!this.#form) {
            this.$helper.warning("表单未加载完成，请稍后再试。");
            return;
        }
        let data = this.#form.getValue();
        if (!data) {
            return;
        }
        //console.log("提交数据:", data);
        const jsonData = JSON.stringify(data);
        this.$http.sendPost({
            url: this.$config.apis.comm_saveNode,
            data: {
                action: this.#config.data ? "edit" : "add",
                type: data.type,
                data: jsonData
            },
            success: () => {
                let result = false;
                this.$helper.success("节点保存成功。");
                if (this.#config.onOk) {
                    result = this.#config.onOk();
                }
                if (result) {
                    this.$helper.closeLayer(null, true, this.#config._elId);
                }
            }
        });
    }

    /**
     * 渲染方法
     * @return
     */
    render() {
        let content = null;
        switch (this.state.current) {
            case "shadowsocks":
                content = <ShadowsocksForm config={this.#config} onRef={(obj) => {
                    this.#form = obj;
                }}/>;
                break;
            case "vmess":
                content = <VmessForm config={this.#config} onRef={(obj) => {
                    this.#form = obj;
                }}/>;
                break;
            case "vless":
                content = <VlessForm config={this.#config} onRef={(obj) => {
                    this.#form = obj;
                }}/>;
                break;
            case "trojan":
                content = <TrojanForm config={this.#config} onRef={(obj) => {
                    this.#form = obj;
                }}/>;
                break;
            case "naive":
                content = <NaiveForm config={this.#config} onRef={(obj) => {
                    this.#form = obj;
                }}/>;
                break;
            case "wireguard":
                content = <WireguardForm config={this.#config} onRef={(obj) => {
                    this.#form = obj;
                }}/>;
                break;
            case "hysteria2":
                content = <Hysteria2Form config={this.#config} onRef={(obj) => {
                    this.#form = obj;
                }}/>;
                break;
            case "tuic":
                content = <TuicForm config={this.#config} onRef={(obj) => {
                    this.#form = obj;
                }}/>;
                break;
            case "anytls":
                content = <AnytlsForm config={this.#config} onRef={(obj) => {
                    this.#form = obj;
                }}/>;
                break;
            case "snell":
                content = <SnellForm config={this.#config} onRef={(obj) => {
                    this.#form = obj;
                }}/>;
                break;
        }
        return <div className="ns-layer add-node-layer">
            <div className={`nlc ${this.state.show ? 'show' : ''}`}>
                <div className="nlc-inner">
                    <div className="title">
                        {
                            this.#config.data ? '编辑节点' : '添加节点'
                        }
                    </div>
                    <div className="tab-group">
                        <div className="tab-bar">
                            <a href="javascript:void(0);" className={this.state.current === "naive" ? "active" : ""} onClick={() =>
                                this.setState({current: "naive"})
                            }>Naive</a>
                            <a href="javascript:void(0);" className={this.state.current === "hysteria2" ? "active" : ""} onClick={() =>
                                this.setState({current: "hysteria2"})
                            }>Hysteria2</a>
                            <a href="javascript:void(0);" className={this.state.current === "shadowsocks" ? "active" : ""} onClick={() =>
                                this.setState({current: "shadowsocks"})
                            }>Shadowsocks</a>
                            <a href="javascript:void(0);" className={this.state.current === "vmess" ? "active" : ""} onClick={() =>
                                this.setState({current: "vmess"})
                            }>Vmess</a>
                            <a href="javascript:void(0);" className={this.state.current === "vless" ? "active" : ""} onClick={() =>
                                this.setState({current: "vless"})
                            }>Vless</a>
                            <a href="javascript:void(0);" className={this.state.current === "trojan" ? "active" : ""} onClick={() =>
                                this.setState({current: "trojan"})
                            }>Trojan</a>
                            {/*<a href="javascript:void(0);" className={this.state.current === "wireguard" ? "active" : ""} onClick={() =>
                                this.setState({current: "wireguard"})
                            }>Wireguard</a>*/}
                            <a href="javascript:void(0);" className={this.state.current === "tuic" ? "active" : ""} onClick={() =>
                                this.setState({current: "tuic"})
                            }>TUIC</a>
                            <a href="javascript:void(0);" className={this.state.current === "anytls" ? "active" : ""} onClick={() =>
                                this.setState({current: "anytls"})
                            }>Anytls</a>
                            <a href="javascript:void(0);" className={this.state.current === "snell" ? "active" : ""} onClick={() =>
                                this.setState({current: "snell"})
                            }>Snell</a>
                        </div>
                        <div className="tab-content">
                            {
                                content
                            }
                        </div>
                    </div>
                    <div className="btn">
                        <a href="#" className="btn btn-cancel hover-btn" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!this.$helper.allowClick("cancel-btn")) {
                                return;
                            }
                            this.$helper.closeLayer(null, true, this.#config._elId);
                        }}>取消</a>
                        <a href="#" className="btn btn-ok hover-btn" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!this.$helper.allowClick("ok-btn")) {
                                return
                            }
                            this.#submit();
                        }}>确定</a>
                    </div>
                </div>
            </div>
        </div>
    }
}

export default AddNodeDialog
