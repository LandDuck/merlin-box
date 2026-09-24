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

readonly DIR=$(cd $(dirname $0); pwd)
readonly MODULE="merlinbox"
readonly APP_NAME="Merlin Box"
# 默认安装到 JFFS
INSTALL_DIR="/jffs/merlin-box"
# 脚本版本
SCRIPT_VERSION="1.0.0"

#=========================================
# 在 Koolshare Merlin 固件上使用软件中心安装
#=========================================
install_to_softcenter(){

  # 检查 /dev/sda 是否存在并已挂载
  if [ -e "/dev/sda" ]; then
      MOUNT_POINT="$(mount | awk '$1 == "/dev/sda" {print $3; exit}')"
      if [ -n "$MOUNT_POINT" ] && [ -d "$MOUNT_POINT" ]; then
          INSTALL_DIR="${MOUNT_POINT}/merlin-box"
      fi
  fi

  echo "开始安装 Merlin Box ${DIR} 到 ${INSTALL_DIR}"
  mkdir -p "${INSTALL_DIR}"

  echo "检测并停止 merlin-box 服务"

  local exists=0
  if [ -f "${INSTALL_DIR}/merlin-box.sh" ]; then
      echo "检测到已安装的 merlin-box，停止服务"
      exists=1
      sh "${INSTALL_DIR}/merlin-box.sh" stop
      sh "${INSTALL_DIR}/merlin-box.sh" server stop
  else
      echo "未检测到已安装的 merlin-box，继续安装"
  fi

  # 列出 dir 目录
  # echo "安装目录内容:"
  # ls -l "${DIR}"

  # 复制软件中心必要文件
  cp -rf "${DIR}/webs/." /koolshare/webs/
  cp -f "${DIR}/scripts/merlinbox_webui.sh" /koolshare/scripts/merlinbox_webui.sh
  cp -f "${DIR}/wwwroot/images/icon-merlinbox.png" /koolshare/res/icon-merlinbox.png
  chmod +x /koolshare/scripts/merlinbox_webui.sh

  echo "正在复制文件到安装目录 ${INSTALL_DIR}，请稍候..."

  # 更新时保留已有数据、配置和资源，首次安装复制全部文件
  if [ "$exists" = 1 ]; then
      local entry
      for entry in "${DIR}"/*; do
          [ -e "$entry" ] || continue
          case "${entry##*/}" in
              db|conf|res) continue ;;
          esac
          cp -rf "$entry" "${INSTALL_DIR}/"
      done
  else
      cp -rf "${DIR}/." "${INSTALL_DIR}/"
  fi

  # 设置脚本权限
  chmod +x "${INSTALL_DIR}/merlin-box.sh"
  chmod +x "${INSTALL_DIR}/start_merlin_box.sh"
  chmod +x "${INSTALL_DIR}/scripts/dnsmasq.postconf"
  chmod +x "${INSTALL_DIR}/bin/sing-box"
  chmod +x "${INSTALL_DIR}/bin/smartdns"
  chmod +x "${INSTALL_DIR}/bin/merlin-box"
  # 删除一些不需要的文件 webs install.sh uninstall.sh
  rm -rf "${INSTALL_DIR}/webs"
  rm -rf "${INSTALL_DIR}/install.sh"
  rm -rf "${INSTALL_DIR}/uninstall.sh"

  # 执行 merlin-box.sh install
  sh "${INSTALL_DIR}/merlin-box.sh" install

  # 注册到列表中
  dbus set softcenter_module_${MODULE}_name="${MODULE}"
  dbus set softcenter_module_${MODULE}_title="${APP_NAME}"
  dbus set softcenter_module_${MODULE}_description="专为 ASUSWRT-Merlin 打造的轻量级透明代理与智能分流工具，以简单、高效的方式实现强大功能，助你轻松连接更广阔的世界"
  dbus set softcenter_module_${MODULE}_version="${SCRIPT_VERSION}"
  dbus set softcenter_module_${MODULE}_install="4"

  dbus set merlinbox_install_dir="${INSTALL_DIR}"

  # 复制卸载脚本
  cp -f "$DIR/uninstall.sh" "/koolshare/scripts/uninstall_${MODULE}.sh"
  chmod 755 "/koolshare/scripts/uninstall_${MODULE}.sh"

  echo "Merlin Box 安装完成"

  :
}

install_to_softcenter
