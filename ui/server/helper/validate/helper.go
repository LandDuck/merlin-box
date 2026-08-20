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

package validate

import (
	"encoding/json"
	httpHelper "merlin-box-ui/helper/http"
	"net/http"
	"regexp"

	"github.com/go-playground/validator/v10"
)

var engine = validator.New()
var usernamePattern = regexp.MustCompile(`^[A-Za-z0-9_]+$`)
var passwordPattern = regexp.MustCompile(`^[\x20-\x7E]+$`)

// init 注册自定义验证器
func init() {
	_ = engine.RegisterValidation("usernamefmt", func(fl validator.FieldLevel) bool {
		return usernamePattern.MatchString(fl.Field().String())
	})
	_ = engine.RegisterValidation("passwordfmt", func(fl validator.FieldLevel) bool {
		return passwordPattern.MatchString(fl.Field().String())
	})
}

// Struct 验证结构体
func Struct(data any) error {
	return engine.Struct(data)
}

// BindAndValidate 绑定请求体并验证结构体
func BindAndValidate[T any](response http.ResponseWriter, request *http.Request) (T, bool) {
	var payload T

	if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
		httpHelper.ResponseFailure(response, "请求体解析失败")
		return payload, false
	}
	if err := Struct(payload); err != nil {
		httpHelper.ResponseFailure(response, FirstErrorMessage(err))
		return payload, false
	}
	return payload, true
}

// FirstErrorMessage 获取第一个验证错误的消息
func FirstErrorMessage(err error) string {
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok || len(validationErrors) == 0 {
		return "参数校验失败"
	}

	fieldErr := validationErrors[0]
	switch fieldErr.Tag() {
	case "required":
		return fieldErr.Field() + " 不能为空"
	case "min":
		return fieldErr.Field() + " 长度太短"
	case "max":
		return fieldErr.Field() + " 长度太长"
	case "usernamefmt":
		return fieldErr.Field() + " 只能包含字母、数字和下划线"
	case "passwordfmt":
		return fieldErr.Field() + " 只能包含可见字符，不含控制字符"
	default:
		return fieldErr.Field() + " 参数不合法"
	}
}
