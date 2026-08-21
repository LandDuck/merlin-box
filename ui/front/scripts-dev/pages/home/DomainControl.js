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
 * DomainControl
 */
class DomainControl extends React.Component {

    /**
     * 构造方法
     * @param props
     */
    constructor(props) {
        super(props);
        this.state = {
            blacklistError: false,
            blocklistError: false,
            blacklist: "",
            blocklist: ""
        };
    }

    #isValidDomain(domain) {
        const normalized = domain.trim().toLowerCase();
        if (normalized === "") {
            return false;
        }
        const pureDomain = normalized.startsWith("*.") ? normalized.substring(2) : normalized;
        if (pureDomain === "") {
            return false;
        }
        const labels = pureDomain.split(".");
        if (labels.length < 2) {
            return false;
        }
        const labelRegExp = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
        for (const label of labels) {
            if (!labelRegExp.test(label)) {
                return false;
            }
        }
        return true;
    }

    #check() {
        const checkDomainList = (domainText) => {
            const lines = domainText.split(/\r?\n/);
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine === "" || trimmedLine.startsWith("#")) {
                    continue;
                }
                const commentIndex = trimmedLine.indexOf("#");
                const domain = (commentIndex >= 0 ? trimmedLine.substring(0, commentIndex) : trimmedLine).trim();
                if (domain === "") {
                    continue;
                }
                if (!this.#isValidDomain(domain)) {
                    return false;
                }
            }
            return true;
        };
        this.state.blacklistError = !checkDomainList(this.state.blacklist);
        this.state.blocklistError = !checkDomainList(this.state.blocklist);
        this.setState({
            blacklistError: this.state.blacklistError,
            blocklistError: this.state.blocklistError
        });
        if (this.state.blacklistError || this.state.blocklistError) {
            return false;
        }
        return true;
    }

    #load() {
        this.$http.sendPost({
            url: this.$config.apis.comm_getDomainControlConfig,
            success: (data) => {
                this.setState({
                    blacklist: data.blacklist || "",
                    blocklist: data.blocklist || ""
                });
            }
        });
    }

    #save() {
        if (!this.#check()) {
            this.$helper.error("配置中存在无效的域名，请检查后再保存。");
            return;
        }

        this.$http.sendPost({
            url: this.$config.apis.comm_saveDomainControlConfig,
            data: {
                blacklist: this.state.blacklist,
                blocklist: this.state.blocklist
            },
            success: () => {
                this.$helper.success("配置保存成功，重启服务生效。");
            }
        });
    }

    componentDidMount() {
        this.#load();
    }

    /**
     * 渲染方法
     * @return
     */
    render() {
        return <div className="domain-config  mb-item">
            <div className="domain-panel">
                <div className="panel-title">
                    <span className="title-icon blacklist-icon"/>
                    <h3>域名黑名单</h3>
                </div>
                <textarea
                    className={`domain-editor ${this.state.blacklistError ? "error" : ""}`}
                    placeholder={"example.com\ntracker.net\nads.provider.io"}
                    value={this.state.blacklist}
                    onChange={(e) => {
                       this.state.blacklist = e.target.value;
                       this.setState({
                           blacklist: this.state.blacklist
                       });
                       this.#check();
                    }}
                />
                <div className="panel-footer">
                      <span className="hint">
                       🚀 通过配置黑名单域名列表使指定域名强制走代理。每行一个域名，支持 *.example.com 写法。
                      </span>
                    <button className="apply-button" onClick={() => {
                       this.#save();
                    }}>
                       保存配置
                    </button>
                </div>
            </div>
            <div className="domain-panel">
                <div className="panel-title">
                    <span className="title-icon sinkhole-icon"/>
                    <h3>域名屏蔽</h3>
                </div>
                <textarea
                    className={`domain-editor ${this.state.blocklistError ? "error" : ""}`}
                    placeholder={"malware-site.ru\nphishing-link.com"}
                    value={this.state.blocklist}
                    onChange={(e) => {
                       this.state.blocklist = e.target.value;
                       this.setState({
                           blocklist: this.state.blocklist
                       });
                       this.#check();
                    }}
                />
                <div className="panel-footer">
                      <span className="hint">
                       🛡️ 广告拦截（屏蔽域名）通过配置黑洞域名列表实现。每行一个域名，支持 *.example.com 写法。
                      </span>
                    <button className="apply-button" onClick={() => {
                       this.#save();
                    }}>
                       保存配置
                    </button>
                </div>
            </div>
        </div>
    }
}

export default DomainControl
