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
                    className="domain-editor"
                    placeholder={"example.com\ntracker.net\nads.provider.io"}
                />
                <div className="panel-footer">
                      <span className="hint">
                        每行一个域名。支持通配符 (*).
                      </span>
                    <button className="apply-button">
                        应用
                    </button>
                </div>
            </div>
            <div className="domain-panel">
                <div className="panel-title">
                    <span className="title-icon sinkhole-icon"/>
                    <h3>域名陷阱</h3>
                </div>
                <textarea
                    className="domain-editor"
                    placeholder={"malware-site.ru\nphishing-link.com"}
                />
                <div className="panel-footer">
                      <span className="hint">
                        域名将被重定向到本地回环 (0.0.0.0)。
                      </span>
                    <button className="apply-button">
                        应用
                    </button>
                </div>
            </div>
        </div>
    }
}

export default DomainControl
