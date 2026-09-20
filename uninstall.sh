#!/bin/sh

#
#  merlin-box - A sing-box + smartdns routing and proxy script solution for ASUSWRT-Merlin routers.
#  Copyright (C) 2026 LandDuck <https://github.com/LandDuck/>
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program.  If not, see <https://www.gnu.org/licenses/>.
#

MODULE="merlinbox"
INSTALL_DIR="/jffs/merlin-box"


#=========================================
# 在 Koolshare Merlin 固件上使用软件中心卸载
#=========================================
uninstall(){

  echo "开始卸载 Merlin Box ${MODULE}"

  # 检查 /dev/sda 是否存在并已挂载
  if [ ! -d "${INSTALL_DIR}" ] && [ -e "/dev/sda" ]; then
      MOUNT_POINT="$(mount | awk '$1 == "/dev/sda" {print $3; exit}')"
      if [ -n "$MOUNT_POINT" ] && [ -d "$MOUNT_POINT" ]; then
          INSTALL_DIR="${MOUNT_POINT}/merlin-box"
      fi
  fi

  # 停止 merlin-box 服务
  echo "停止 merlin-box 服务"
  if [ -f "${INSTALL_DIR}/merlin-box.sh" ]; then
      sh "${INSTALL_DIR}/merlin-box.sh" stop
      sh "${INSTALL_DIR}/merlin-box.sh" server stop
  fi

  # 删除安装目录
  if [ -d "${INSTALL_DIR}" ]; then
      echo "删除安装目录 ${INSTALL_DIR}"
      rm -rf "${INSTALL_DIR}"
  else
      echo "安装目录 ${INSTALL_DIR} 不存在，跳过删除"
  fi

  # 删除注册信息
  dbus remove softcenter_module_${MODULE}_name
  dbus remove softcenter_module_${MODULE}_title
  dbus remove softcenter_module_${MODULE}_description
  dbus remove softcenter_module_${MODULE}_version
  dbus remove softcenter_module_${MODULE}_install

  # 删除卸载脚本
  rm -f "/koolshare/scripts/uninstall_${MODULE}.sh"
  # 删除asp文件和图标
  rm -f "/koolshare/webs/Module_${MODULE}.asp"
  rm -f "/koolshare/res/icon-${MODULE}.png"

  echo "Merlin Box 卸载完成"
}

uninstall
