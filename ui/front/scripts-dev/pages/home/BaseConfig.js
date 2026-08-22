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

    //中国DNS列表
    #chinaDnsList = [
        {
            "value": "223.5.5.5",
            "label": "阿里 DNS(223.5.5.5)"
        },
        {
            "value": "223.6.6.6",
            "label": "阿里 DNS(223.6.6.6)"
        },
        {
            "value": "119.28.28.28",
            "label": "腾讯 DNSPod(119.28.28.28)"
        },
        {
            "value": "119.29.29.29",
            "label": "腾讯 DNSPod(119.29.29.29)"
        },
        {
            "value": "114.114.114.114",
            "label": "114 DNS(114.114.114.114)"
        },
        {
            "value": "114.114.115.115",
            "label": "114 DNS(114.114.115.115)"
        },
        {
            "value": "180.76.76.76",
            "label": "百度 DNS(180.76.76.76)"
        },
        {
            "value": "180.184.1.1",
            "label": "火山引擎 DNS(180.184.1.1)"
        },
        {
            "value": "180.184.2.2",
            "label": "火山引擎 DNS(180.184.2.2)"
        },
        {
            "value": "1.2.4.8",
            "label": "CNNIC SDNS(1.2.4.8)"
        },
        {
            "value": "210.2.4.8",
            "label": "CNNIC SDNS(210.2.4.8)"
        }
    ]

    //国际DNS列表
    #foreignDnsList = [
        {
            "value": "https://1.1.1.1/dns-query",
            "label": "Cloudflare"
        },
        {
            "value": "https://1.1.1.2/dns-query",
            "label": "Cloudflare Security"
        },
        {
            "value": "https://1.1.1.3/dns-query",
            "label": "Cloudflare Family"
        },
        {
            "value": "https://8.8.8.8/dns-query",
            "label": "Google"
        },
        {
            "value": "https://9.9.9.9/dns-query",
            "label": "Quad9 Security"
        },
        {
            "value": "https://9.9.9.10/dns-query",
            "label": "Quad9 Unfiltered"
        },
        {
            "value": "https://9.9.9.11/dns-query",
            "label": "Quad9 Security + ECS"
        },
        {
            "value": "https://94.140.14.14/dns-query",
            "label": "AdGuard"
        },
        {
            "value": "https://94.140.14.15/dns-query",
            "label": "AdGuard Family"
        },
        {
            "value": "https://208.67.222.222/dns-query",
            "label": "OpenDNS"
        }
    ]

    /**
     * 构造方法
     * @param props
     */
    constructor(props) {
        super(props);
        this.state = {
            inited: false,

            enableIPv6: 1,
            enableUDP: 0,
            disableQUIC: 1,
            routeSelfProxy: 0,

            dnsChina1: "223.5.5.5",
            dnsChina2: "119.28.28.28",

            dnsForeign1: "https://cloudflare-dns.com/dns-query",
            dnsForeign2: "https://dns.google/dns-query"
        };
    }

    /**
     * 组件挂载完成后执行
     */
    componentDidMount() {
        this.#load();
    }

    /**
     * 加载数据
     */
    #load() {
        this.$http.sendPost({
            url: this.$config.apis.comm_getBaseConfig,
            success: (data) => {
                this.setState({
                    enableIPv6: data.enableIPv6 ?? 1,
                    enableUDP: data.enableUDP ?? 0,
                    disableQUIC: data.disableQUIC ?? 1,
                    routeSelfProxy: data.routeSelfProxy ?? 0,
                    dnsChina1: (data.dnsChina && data.dnsChina[0]) || "223.5.5.5",
                    dnsChina2: (data.dnsChina && data.dnsChina[1]) || "119.28.28.28",
                    dnsForeign1: (data.dnsForeign && data.dnsForeign[0]) || "https://cloudflare-dns.com/dns-query",
                    dnsForeign2: (data.dnsForeign && data.dnsForeign[1]) || "https://dns.google/dns-query",
                    inited: true
                });
            }
        });
    }

    /**
     * 保存数据（合并传入的更新值，避免 setState 异步问题）
     * @param {object} updates - 需要更新的字段
     */
    #saveWith(updates) {
        const s = {...this.state, ...updates};

        if (s.dnsChina1 === s.dnsChina2) {
            this.$helper.error("大陆DNS不能配置相同的地址");
            return;
        }
        if (s.dnsForeign1 === s.dnsForeign2) {
            this.$helper.error("国际DNS不能配置相同的地址");
            return;
        }

        this.$http.sendPost({
            url: this.$config.apis.comm_saveBaseConfig,
            data: {
                enableIPv6: s.enableIPv6,
                enableUDP: s.enableUDP,
                disableQUIC: s.disableQUIC,
                routeSelfProxy: s.routeSelfProxy,
                dnsChina: [s.dnsChina1, s.dnsChina2],
                dnsForeign: [s.dnsForeign1, s.dnsForeign2]
            },
            success: () => {
                this.$helper.success("保存成功");
            }
        });
    }

    /**
     * 渲染方法
     * @return
     */
    render() {
        return this.state.inited ? <div className="domain-config base-config mb-item">
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
                                checked={this.state.enableIPv6 === 1}
                                onChange={(checked) => {
                                    const val = checked ? 1 : 0;
                                    this.setState({enableIPv6: val});
                                    this.#saveWith({enableIPv6: val});
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
                                checked={this.state.enableUDP === 1}
                                onChange={(checked) => {
                                    const val = checked ? 1 : 0;
                                    this.setState({enableUDP: val});
                                    this.#saveWith({enableUDP: val});
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
                                checked={this.state.disableQUIC === 1}
                                onChange={(checked) => {
                                    const val = checked ? 1 : 0;
                                    this.setState({disableQUIC: val});
                                    this.#saveWith({disableQUIC: val});
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
                                checked={this.state.routeSelfProxy === 1}
                                onChange={(checked) => {
                                    const val = checked ? 1 : 0;
                                    this.setState({routeSelfProxy: val});
                                    this.#saveWith({routeSelfProxy: val});
                                }}
                            />
                        </div>
                    </div>
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
                                value={this.state.dnsChina1}
                                style={{width: 230}}
                                onChange={(val) => {
                                    this.setState({dnsChina1: val});
                                    this.#saveWith({dnsChina1: val});
                                }}
                                options={this.#chinaDnsList}
                            />
                        </div>
                    </div>
                    <div className="item">
                        <div className="item-name">
                            大陆DNS2
                        </div>
                        <div className="item-comp">
                            <antd.Select
                                value={this.state.dnsChina2}
                                style={{width: 230}}
                                onChange={(val) => {
                                    this.setState({dnsChina2: val});
                                    this.#saveWith({dnsChina2: val});
                                }}
                                options={this.#chinaDnsList}
                            />
                        </div>
                    </div>
                    <div className="item">
                        <div className="item-name">
                            国际DNS1
                        </div>
                        <div className="item-comp">
                            <antd.Select
                                value={this.state.dnsForeign1}
                                style={{width: 230}}
                                onChange={(val) => {
                                    this.setState({dnsForeign1: val});
                                    this.#saveWith({dnsForeign1: val});
                                }}
                                options={this.#foreignDnsList}
                            />
                        </div>
                    </div>
                    <div className="item">
                        <div className="item-name">
                            国际DNS2
                        </div>
                        <div className="item-comp">
                            <antd.Select
                                value={this.state.dnsForeign2}
                                style={{width: 230}}
                                onChange={(val) => {
                                    this.setState({dnsForeign2: val});
                                    this.#saveWith({dnsForeign2: val});
                                }}
                                options={this.#foreignDnsList}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div> : null
    }
}

export default BaseConfig
