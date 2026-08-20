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

package db

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"merlin-box-ui/global"
	dbModel "merlin-box-ui/model/db"
	"os"
)

// ReadFile 读取数据库文件并解析为 dbModel.File 结构体
func ReadFile() (dbModel.Database, error) {
	content, err := os.ReadFile(global.DbPath)
	if err != nil {
		return dbModel.Database{}, err
	}
	var file dbModel.Database
	if err = json.Unmarshal(content, &file); err != nil {
		return dbModel.Database{}, err
	}
	return file, nil
}

// CheckManager 检查管理员用户名和密码是否匹配
func CheckManager(username, password string) (bool, error) {
	file, err := ReadFile()
	if err != nil {
		return false, err
	}

	passwordMD5 := md5.Sum([]byte(password))
	passwordHash := hex.EncodeToString(passwordMD5[:])

	for _, manager := range file.Managers {
		if manager.Username == username && manager.Password == passwordHash {
			return true, nil
		}
	}
	return false, nil
}
