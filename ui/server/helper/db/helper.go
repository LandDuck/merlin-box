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
	logger "merlin-box-ui/helper/log"
	dbModel "merlin-box-ui/model/db"
	"os"
	"strings"
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

// GetDeviceControlConfig 获取设备控制配置
func GetDeviceControlConfig() (dbModel.DeviceInfo, error) {
	file, err := ReadFile()
	if err != nil {
		return dbModel.DeviceInfo{}, err
	}
	return file.Device, nil
}

// SaveDeviceControlConfig 保存设备控制配置
func SaveDeviceControlConfig(deviceInfo dbModel.DeviceInfo) error {
	file, err := ReadFile()
	if err != nil {
		return err
	}
	file.Device = deviceInfo

	content, err := json.MarshalIndent(file, "", "  ")
	if err != nil {
		return err
	}

	//需要同步处理 global.ResDir 目录下的 device_blacklist.txt  和 device_whitelist.txt
	//如果 trim 后结果为空，则删除文件；如果不为空，则写入文件
	blacklistPath := global.ResDir + "/device_blacklist.txt"
	whitelistPath := global.ResDir + "/device_whitelist.txt"

	if strings.TrimSpace(deviceInfo.Blacklist) == "" {
		if err := os.Remove(blacklistPath); err != nil && !os.IsNotExist(err) {
			logger.Warn("remove blacklist file failed:", err)
		}
	} else {
		if err := os.WriteFile(blacklistPath, []byte(deviceInfo.Blacklist), 0o644); err != nil {
			logger.Warn("write blacklist file failed:", err)
		}
	}
	if strings.TrimSpace(deviceInfo.Whitelist) == "" {
		if err := os.Remove(whitelistPath); err != nil && !os.IsNotExist(err) {
			logger.Warn("remove whitelist file failed:", err)
		}
	} else {
		if err := os.WriteFile(whitelistPath, []byte(deviceInfo.Whitelist), 0o644); err != nil {
			logger.Warn("write whitelist file failed:", err)
		}
	}

	return os.WriteFile(global.DbPath, content, 0o644)
}

// getIPConfig 获取 IP 控制配置
func getIPConfig(file dbModel.Database, kind string) dbModel.IPControlInfo {
	if kind == "ip4" {
		return file.IP4
	}
	return file.IP6
}

// saveIPConfig 保存 IP 控制配置
func saveIPConfig(file *dbModel.Database, kind string, ipInfo dbModel.IPControlInfo) {
	if kind == "ip4" {
		file.IP4 = ipInfo
		return
	}
	file.IP6 = ipInfo
}

// syncConfigFile 同步配置文件到 res 目录
func syncConfigFile(path string, content string) error {
	if strings.TrimSpace(content) == "" {
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			return err
		}
		return nil
	}
	return os.WriteFile(path, []byte(content), 0o644)
}

// GetIP4ControlConfig 获取 IPv4 控制配置
func GetIP4ControlConfig() (dbModel.IPControlInfo, error) {
	file, err := ReadFile()
	if err != nil {
		return dbModel.IPControlInfo{}, err
	}
	return file.IP4, nil
}

// SaveIP4ControlConfig 保存 IPv4 控制配置
func SaveIP4ControlConfig(ipInfo dbModel.IPControlInfo) error {
	file, err := ReadFile()
	if err != nil {
		return err
	}
	file.IP4 = ipInfo

	content, err := json.MarshalIndent(file, "", "  ")
	if err != nil {
		return err
	}

	whitelistPath := global.ResDir + "/ip4-whitelist.txt"
	blacklistPath := global.ResDir + "/ip4-blacklist.txt"
	if err := syncConfigFile(whitelistPath, ipInfo.Whitelist); err != nil {
		logger.Warn("write IPv4 whitelist file failed:", err)
	}
	if err := syncConfigFile(blacklistPath, ipInfo.Blacklist); err != nil {
		logger.Warn("write IPv4 blacklist file failed:", err)
	}
	return os.WriteFile(global.DbPath, content, 0o644)
}

// GetIP6ControlConfig 获取 IPv6 控制配置
func GetIP6ControlConfig() (dbModel.IPControlInfo, error) {
	file, err := ReadFile()
	if err != nil {
		return dbModel.IPControlInfo{}, err
	}
	return file.IP6, nil
}

// SaveIP6ControlConfig 保存 IPv6 控制配置
func SaveIP6ControlConfig(ipInfo dbModel.IPControlInfo) error {
	file, err := ReadFile()
	if err != nil {
		return err
	}
	file.IP6 = ipInfo

	content, err := json.MarshalIndent(file, "", "  ")
	if err != nil {
		return err
	}

	whitelistPath := global.ResDir + "/ip6-whitelist.txt"
	blacklistPath := global.ResDir + "/ip6-blacklist.txt"
	if err := syncConfigFile(whitelistPath, ipInfo.Whitelist); err != nil {
		logger.Warn("write IPv6 whitelist file failed:", err)
	}
	if err := syncConfigFile(blacklistPath, ipInfo.Blacklist); err != nil {
		logger.Warn("write IPv6 blacklist file failed:", err)
	}
	return os.WriteFile(global.DbPath, content, 0o644)
}

// GetDomainControlConfig 获取域名控制配置
func GetDomainControlConfig() (dbModel.DomainControlInfo, error) {
	file, err := ReadFile()
	if err != nil {
		return dbModel.DomainControlInfo{}, err
	}
	return file.Domain, nil
}

// SaveDomainControlConfig 保存域名控制配置
func SaveDomainControlConfig(domainInfo dbModel.DomainControlInfo) error {
	file, err := ReadFile()
	if err != nil {
		return err
	}
	file.Domain = domainInfo

	content, err := json.MarshalIndent(file, "", "  ")
	if err != nil {
		return err
	}

	blacklistPath := global.ResDir + "/site-blacklist.txt"
	blocklistPath := global.ResDir + "/site-blocklist.txt"
	if err := syncConfigFile(blacklistPath, domainInfo.Blacklist); err != nil {
		logger.Warn("write domain blacklist file failed:", err)
	}
	if err := syncConfigFile(blocklistPath, domainInfo.Blocklist); err != nil {
		logger.Warn("write domain blocklist file failed:", err)
	}
	return os.WriteFile(global.DbPath, content, 0o644)
}
