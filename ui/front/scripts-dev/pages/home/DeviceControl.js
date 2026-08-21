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
 * DeviceControl
 */
class DeviceControl extends React.Component {

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
        return <section className="device-control  mb-item">
            <div className="section-title">
                <span className="device-icon"/>
                <h2>设备控制</h2>
            </div>
            <div className="device-config">
                <div className="device-group">
                    <label>
                        设备白名单 (MAC 地址)
                    </label>
                    <textarea
                        className="device-editor"
                        placeholder={"00:1A:2B:3C:4D:5E\nAA:BB:CC:DD:EE:FF"}
                    />
                </div>
                <div className="device-group">
                    <label>
                        设备黑名单 (MAC 地址)
                    </label>
                    <textarea
                        className="device-editor"
                        placeholder={"6E:D5:43:21:0A:9B"}
                    />
                </div>
            </div>
            <div className="device-footer">
                <button className="save-button">
                    保存配置
                </button>
            </div>
        </section>
    }
}

export default DeviceControl
