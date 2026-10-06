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
	"net/http"

	dbHelper "github.com/LandDuck/merlin-box/helper/db"
	httpHelper "github.com/LandDuck/merlin-box/helper/http"
	validateHelper "github.com/LandDuck/merlin-box/helper/validate"
	dbModel "github.com/LandDuck/merlin-box/model/db"
	reqModel "github.com/LandDuck/merlin-box/model/req"
)

// SaveSubscription 保存订阅（guid 存在则更新，否则新增）
func SaveSubscription(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[reqModel.SaveSubscription](w, r)
	if !ok {
		return
	}
	sub := dbModel.Subscription{
		Guid: requestData.Guid,
		Name: requestData.Name,
		Link: requestData.Link,
	}
	if err := dbHelper.SaveSubscription(sub); err != nil {
		httpHelper.ResponseFailure(w, "保存订阅失败")
		return
	}
	httpHelper.ResponseSuccess(w, "保存成功")
}

// GetSubscriptionList 获取订阅列表
func GetSubscriptionList(w http.ResponseWriter, r *http.Request) {
	subs, err := dbHelper.GetSubscriptionList()
	if err != nil {
		httpHelper.ResponseFailure(w, "读取订阅列表失败")
		return
	}
	httpHelper.ResponseSuccess(w, subs)
}

// DeleteSubscription 删除订阅（按 guid）
func DeleteSubscription(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[reqModel.SubscriptionGuidRequest](w, r)
	if !ok {
		return
	}
	if err := dbHelper.DeleteSubscription(requestData.Guid); err != nil {
		httpHelper.ResponseFailure(w, "删除订阅失败")
		return
	}
	//清空数据库中该分类下的节点配置
	dbHelper.DeleteNodesByCategory(requestData.Guid)
	httpHelper.ResponseSuccess(w, "删除成功")
}

// LoadSubscription 加载订阅（按 guid）
func LoadSubscription(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[reqModel.SubscriptionGuidRequest](w, r)
	if !ok {
		return
	}
	sub, err := dbHelper.GetSubscriptionByGuid(requestData.Guid)
	if err != nil {
		httpHelper.ResponseFailure(w, "获取订阅失败")
		return
	}
	httpHelper.ResponseSuccess(w, sub)
}

// UpdateSubscriptionNodes 更新订阅节点，并异步返回脚本输出日志
func UpdateSubscriptionNodes(w http.ResponseWriter, r *http.Request) {
	requestData, ok := validateHelper.BindAndValidate[reqModel.SubscriptionGuidRequest](w, r)
	if !ok {
		return
	}
	model, err := dbHelper.GetSubscriptionByGuid(requestData.Guid)
	if err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	if err := runServiceScriptAsync("tool", "sub2nodes", model.Link, model.Guid); err != nil {
		httpHelper.ResponseFailure(w, err.Error())
		return
	}
	httpHelper.ResponseSuccess[any](w, nil)
}
