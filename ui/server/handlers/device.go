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

// GetIP4ControlConfig 获取 IPv4 控制配置
func GetIP4ControlConfig(w http.ResponseWriter, r *http.Request) {
	ipInfo, err := dbHelper.GetIP4ControlConfig()
	if err != nil {
		httpHelper.ResponseFailure(w, "读取 IPv4 控制配置失败")
		return
	}
	httpHelper.ResponseSuccess(w, ipInfo)
}

// SaveIP4ControlConfig 保存 IPv4 控制配置
func SaveIP4ControlConfig(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[req.SaveIP4ControlConfig](w, r)
	if !ok {
		return
	}

	if err := dbHelper.SaveIP4ControlConfig(dbModel.IPControlInfo{
		Blacklist: requestData.Blacklist,
		Whitelist: requestData.Whitelist,
	}); err != nil {
		httpHelper.ResponseFailure(w, "保存 IPv4 控制配置失败")
		return
	}

	httpHelper.ResponseSuccess(w, "保存成功")
}

// GetIP6ControlConfig 获取 IPv6 控制配置
func GetIP6ControlConfig(w http.ResponseWriter, r *http.Request) {
	ipInfo, err := dbHelper.GetIP6ControlConfig()
	if err != nil {
		httpHelper.ResponseFailure(w, "读取 IPv6 控制配置失败")
		return
	}
	httpHelper.ResponseSuccess(w, ipInfo)
}

// SaveIP6ControlConfig 保存 IPv6 控制配置
func SaveIP6ControlConfig(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[req.SaveIP6ControlConfig](w, r)
	if !ok {
		return
	}

	if err := dbHelper.SaveIP6ControlConfig(dbModel.IPControlInfo{
		Blacklist: requestData.Blacklist,
		Whitelist: requestData.Whitelist,
	}); err != nil {
		httpHelper.ResponseFailure(w, "保存 IPv6 控制配置失败")
		return
	}

	httpHelper.ResponseSuccess(w, "保存成功")
}

// GetDomainControlConfig 获取域名控制配置
func GetDomainControlConfig(w http.ResponseWriter, r *http.Request) {
	domainInfo, err := dbHelper.GetDomainControlConfig()
	if err != nil {
		httpHelper.ResponseFailure(w, "读取域名控制配置失败")
		return
	}
	httpHelper.ResponseSuccess(w, domainInfo)
}

// SaveDomainControlConfig 保存域名控制配置
func SaveDomainControlConfig(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[req.SaveDomainControlConfig](w, r)
	if !ok {
		return
	}

	if err := dbHelper.SaveDomainControlConfig(dbModel.DomainControlInfo{
		Blocklist: requestData.Blocklist,
		Blacklist: requestData.Blacklist,
		Whitelist: requestData.Whitelist,
		Hostlist:  requestData.Hostlist,
	}); err != nil {
		httpHelper.ResponseFailure(w, "保存域名控制配置失败")
		return
	}

	httpHelper.ResponseSuccess(w, "保存成功")
}
