/*!
 * merlin-box - A sing-box + smartdns routing and proxy script solution for ASUSWRT-Merlin routers.
 * Copyright (C) 2026 LandDuck <https://github.com/LandDuck/>
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
(()=>{var o=class{constructor(){this.$helper=window.$helper,this.$http=window.$http,this.$storage=window.$storage,this.$config=window.$config}setTitle(e,t){this.$helper.setTitle(e,t)}},i=o;var s=class extends React.Component{constructor(e){super(e)}render(){let e={};return this.props.bgColor&&this.props.bgColor!==""&&(e.backgroundColor=this.props.bgColor),React.createElement("div",{className:`content-inner ${this.props.className?this.props.className:""}`,style:e},this.props.noInner?this.props.children:React.createElement("div",{style:this.props.innerStyle,className:"inner"},this.props.children))}},p=s;var r=class extends i{main(e){let t=document.querySelector("#react-content");window.createRoot(t).render(React.createElement(p,{className:"error-page",noInner:!0}))}};window.page=new r;})();
