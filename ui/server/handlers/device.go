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

package handlers

import (
	dbHelper "merlin-box-ui/helper/db"
	httpHelper "merlin-box-ui/helper/http"
	validateHelper "merlin-box-ui/helper/validate"
	dbModel "merlin-box-ui/model/db"
	"merlin-box-ui/model/req"
	"net/http"
)

// GetDeviceControlConfig 获取设备控制配置
func GetDeviceControlConfig(w http.ResponseWriter, r *http.Request) {
	deviceInfo, err := dbHelper.GetDeviceControlConfig()
	if err != nil {
		httpHelper.ResponseFailure(w, "读取设备控制配置失败")
		return
	}
	httpHelper.ResponseSuccess(w, deviceInfo)
}

// SaveDeviceControlConfig 保存设备控制配置
func SaveDeviceControlConfig(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[req.SaveDeviceControlConfig](w, r)
	if !ok {
		return
	}

	if err := dbHelper.SaveDeviceControlConfig(dbModel.DeviceInfo{
		Blacklist: requestData.Blacklist,
		Whitelist: requestData.Whitelist,
	}); err != nil {
		httpHelper.ResponseFailure(w, "保存设备控制配置失败")
		return
	}

	httpHelper.ResponseSuccess(w, "保存成功")
}
