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
    }

    /**
     * 渲染方法
     * @returns
     */
    render() {
        const status = <Status/>;
        const nodeList = <NodeList/>;
        const domainControl = <DomainControl/>;
        const deviceControl = <DeviceControl/>;
        return [
            <div className="hero-header">
                <h1 className="hero-title">
                    Merlin-box-UI
                </h1>
                <p className="hero-description">
                    基于 ASUSWRT-Merlin 路由器环境的 sing-box + smartdns 分流代理脚本方案。
                </p>
            </div>,
            status,
            nodeList,
            domainControl,
            deviceControl
        ]
    }
}

export default Main
