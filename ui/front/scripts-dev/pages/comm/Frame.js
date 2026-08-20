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
 * 主框架
 */
class Frame extends React.Component {

    /**
     * 构造方法
     * @param props
     */
    constructor(props) {
        super(props);
    }

    /**
     * 渲染方法
     * @returns {JSX.Element}
     */
    render() {
        let css = {}
        if (this.props.bgColor && this.props.bgColor !== '') {
            css.backgroundColor = this.props.bgColor;
        }
        return (
            <div className={`content-inner ${this.props.className ? this.props.className : ''}`} style={
                css
            }>
                {
                    this.props.noInner ? this.props.children : <div style={this.props.innerStyle} className="inner">
                        {this.props.children}
                    </div>
                }
            </div>
        );
    }
}

export default Frame
