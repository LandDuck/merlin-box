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

/**
 * BaseConfig
 */
class BaseConfig extends React.Component {

    /**
     * 构造方法
     * @param props
     */
    constructor(props) {
        super(props);
        this.state = {
            enableIPv6: 1,
            enableUDP: 0,
            disableQUIC: 1,
            routeSelfProxy: 0,
        };
    }

    /**
     * 组件挂载完成后执行
     */
    componentDidMount() {

    }

    /**
     * 渲染方法
     * @return
     */
    render() {
        return <div className="domain-config base-config mb-item">
            <div className="domain-panel">
                <div className="panel-title">
                    <span className="title-icon base-config-icon"/>
                    <h3>基础选项</h3>
                </div>
                <div className="domain-editor">
                    <div className="item">
                        <div className="item-name">
                            启用IPV6
                        </div>
                        <div className="item-comp">
                            <antd.Switch
                                defaultChecked={this.state.enableIPv6 === 1}
                                onChange={(checked) => {
                                    this.setState({enableIPv6: checked ? 1 : 0});
                                }}
                            />
                        </div>
                    </div>
                    <div className="item">
                        <div className="item-name">
                            启用UDP
                        </div>
                        <div className="item-comp">
                            <antd.Switch
                                defaultChecked={this.state.enableUDP === 1}
                                onChange={(checked) => {
                                    this.setState({enableUDP: checked ? 1 : 0});
                                }}
                            />
                        </div>
                    </div>
                    <div className="item">
                        <div className="item-name">
                            禁用QUIC
                        </div>
                        <div className="item-comp">
                            <antd.Switch
                                defaultChecked={this.state.disableQUIC === 1}
                                onChange={(checked) => {
                                    this.setState({disableQUIC: checked ? 1 : 0});
                                }}
                            />
                        </div>
                    </div>
                    <div className="item">
                        <div className="item-name">
                            路由自身代理
                        </div>
                        <div className="item-comp">
                            <antd.Switch
                                defaultChecked={this.state.routeSelfProxy === 1}
                                onChange={(checked) => {
                                    this.setState({routeSelfProxy: checked ? 1 : 0});
                                }}
                            />
                        </div>
                    </div>
                </div>
                <div className="panel-footer">
                      <span className="hint">
                       这里是一段帮助内容
                      </span>
                    <button className="apply-button" onClick={() => {

                    }}>
                        保存配置
                    </button>
                </div>
            </div>
            <div className="domain-panel">
                <div className="panel-title">
                    <span className="title-icon dns-config-icon"/>
                    <h3>DNS配置</h3>
                </div>
                <div className="domain-editor">
                    <div className="item">
                        <div className="item-name">
                            大陆DNS1
                        </div>
                        <div className="item-comp">
                            <antd.Select
                                defaultValue="lucy"
                                style={{width: 230}}
                                onChange={() => {
                                }}
                                options={[
                                    {value: 'jack', label: 'Jack'},
                                    {value: 'lucy', label: 'Lucy'},
                                    {value: 'Yiminghe', label: 'yiminghe'},
                                    {value: 'disabled', label: 'Disabled', disabled: true},
                                ]}
                            />
                        </div>
                    </div>
                    <div className="item">
                        <div className="item-name">
                            大陆DNS2
                        </div>
                        <div className="item-comp">
                            <antd.Select
                                defaultValue="lucy"
                                style={{width: 230}}
                                onChange={() => {
                                }}
                                options={[
                                    {value: 'jack', label: 'Jack'},
                                    {value: 'lucy', label: 'Lucy'},
                                    {value: 'Yiminghe', label: 'yiminghe'},
                                    {value: 'disabled', label: 'Disabled', disabled: true},
                                ]}
                            />
                        </div>
                    </div>
                    <div className="item">
                        <div className="item-name">
                            国外DNS1
                        </div>
                        <div className="item-comp">
                            <antd.Select
                                defaultValue="lucy"
                                style={{width: 230}}
                                onChange={() => {
                                }}
                                options={[
                                    {value: 'jack', label: 'Jack'},
                                    {value: 'lucy', label: 'Lucy'},
                                    {value: 'Yiminghe', label: 'yiminghe'},
                                    {value: 'disabled', label: 'Disabled', disabled: true},
                                ]}
                            />
                        </div>
                    </div>
                    <div className="item">
                        <div className="item-name">
                            国外DNS2
                        </div>
                        <div className="item-comp">
                            <antd.Select
                                defaultValue="lucy"
                                style={{width: 230}}
                                onChange={() => {
                                }}
                                options={[
                                    {value: 'jack', label: 'Jack'},
                                    {value: 'lucy', label: 'Lucy'},
                                    {value: 'Yiminghe', label: 'yiminghe'},
                                    {value: 'disabled', label: 'Disabled', disabled: true},
                                ]}
                            />
                        </div>
                    </div>
                </div>
                <div className="panel-footer">
                      <span className="hint">
                       这里是一段帮助内容
                      </span>
                    <button className="apply-button" onClick={() => {

                    }}>
                        保存配置
                    </button>
                </div>
            </div>
        </div>
    }
}

export default BaseConfig
