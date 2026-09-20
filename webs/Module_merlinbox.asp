<!--
  ~ # merlin-box - A sing-box + smartdns routing and proxy script solution for ASUSWRT-Merlin routers.
  ~ # Copyright (C) 2026 LandDuck <https://github.com/LandDuck/>
  ~ #
  ~ # This program is free software: you can redistribute it and/or modify
  ~ # it under the terms of the GNU General Public License as published by
  ~ # the Free Software Foundation, either version 3 of the License, or
  ~ # (at your option) any later version.
  ~ #
  ~ # This program is distributed in the hope that it will be useful,
  ~ # but WITHOUT ANY WARRANTY; without even the implied warranty of
  ~ # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  ~ # GNU General Public License for more details.
  ~ #
  ~ # You should have received a copy of the GNU General Public License
  ~ # along with this program.  If not, see <https://www.gnu.org/licenses/>.
-->

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
	"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="X-UA-Compatible" content="IE=Edge"/>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta HTTP-EQUIV="Pragma" CONTENT="no-cache">
<meta HTTP-EQUIV="Expires" CONTENT="-1">

<link rel="shortcut icon" href="images/favicon.png">
<link rel="icon" href="images/favicon.png">

<title>软件中心 - Merlin Box</title>

<link rel="stylesheet" type="text/css" href="index_style.css"/>
<link rel="stylesheet" type="text/css" href="form_style.css"/>
<link rel="stylesheet" type="text/css" href="/res/softcenter.css">

<script type="text/javascript" src="/js/jquery.js"></script>
<script type="text/javascript" src="/state.js"></script>
<script type="text/javascript" src="/general.js"></script>
<script type="text/javascript" src="/popup.js"></script>
<script type="text/javascript" src="/res/softcenter.js"></script>

<script type="text/javascript">

function init() {
	show_menu(menu_hook);
}

/*
 * 将 Merlin Box 页面挂入软件中心菜单。
 */
function menu_hook(title, tab) {
	tabtitle[tabtitle.length - 1] = new Array("", "Merlin Box");
	tablink[tablink.length - 1] = new Array("", "Module_merlinbox.asp");
}

/*
 * 启动 WEBUI。
 * 当前仅保留接口，暂不执行任何操作。
 */
function start_webui() {
	alert("启动 WEBUI");
}

/*
 * 停止 WEBUI。
 * 当前仅保留接口，暂不执行任何操作。
 */
function stop_webui() {
	alert("停止 WEBUI");
}

</script>

</head>

<body id="app" skin='<% nvram_get("sc_skin"); %>' onload="init();">

<div id="TopBanner"></div>
<div id="Loading" class="popup_bg"></div>

<table class="content" align="center" cellpadding="0" cellspacing="0">
	<tr>
		<td width="17">&nbsp;</td>

		<!-- 左侧 ASUSWRT 菜单 -->
		<td valign="top" width="202">
			<div id="mainMenu"></div>
			<div id="subMenu"></div>
		</td>

		<!-- 页面主体 -->
		<td valign="top">

			<div id="tabMenu" class="submenuBlock"></div>

			<table width="98%" border="0" align="left"
				   cellpadding="0" cellspacing="0">
				<tr>
					<td align="left" valign="top">

						<table width="760px"
							   border="0"
							   cellpadding="5"
							   cellspacing="0"
							   bordercolor="#6b8fa3"
							   class="FormTitle"
							   id="FormTitle">

							<tr>
								<td bgcolor="#4D595D"
									colspan="3"
									valign="top">

									<div>&nbsp;</div>

									<!-- 标题 -->
									<div class="formfonttitle">
										Merlin Box
									</div>

									<!-- 返回软件中心 -->
									<div style="float:right;
												width:15px;
												height:25px;
												margin-top:-20px">

										<img id="return_btn"
											 onclick="reload_Soft_Center();"
											 align="right"
											 style="cursor:pointer;
													position:absolute;
													margin-left:-30px;
													margin-top:-25px;"
											 title="返回软件中心"
											 src="/images/backprev.png"
											 onMouseOver="this.src='/images/backprevclick.png'"
											 onMouseOut="this.src='/images/backprev.png'" />
									</div>

									<div style="margin:10px 0 10px 5px;"
										 class="splitLine">
									</div>

									<!-- WEBUI -->
									<table width="100%"
										   border="1"
										   align="center"
										   cellpadding="4"
										   cellspacing="0"
										   class="FormTable">

										<thead>
											<tr>
												<td colspan="2">
													WEBUI
												</td>
											</tr>
										</thead>

										<tr>
											<th>WEBUI</th>

											<td>
												<span id="webui_status">
													未启动
												</span>

												&nbsp;&nbsp;

												<input
													id="webui_start"
													class="button_gen"
													type="button"
													value="启动"
													onclick="start_webui();" />

												&nbsp;&nbsp;

												<a id="webui_link"
												   href="http://192.168.50.1:8080"
												   target="_blank"
												   style="display:none;">
													打开 WEBUI
												</a>

												&nbsp;&nbsp;

												<a id="webui_stop"
												   href="javascript:void(0);"
												   onclick="stop_webui();"
												   style="display:none;">
													停止 WEBUI
												</a>
											</td>
										</tr>

									</table>

								</td>
							</tr>
						</table>

					</td>
				</tr>
			</table>

		</td>

		<td width="10"
			align="center"
			valign="top">
		</td>
	</tr>
</table>

<div id="footer"></div>

</body>
</html>
