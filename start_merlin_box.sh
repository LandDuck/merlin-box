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

# 此文件主要用于在路由器启动时自动启动 merlin-box，或者在 WAN 连接事件触发时重新启动 merlin-box。

# 日志
readonly LOGFILE="/tmp/merlin-box-boot.log"
# merlin-box 根目录，脚本会自动修改
readonly MD_ROOT_DIR="/jffs/xxxxxxx"
# 安装时获取的系统年份
readonly INSTALL_YEAR=2026
# 并发锁
readonly LOCK_DIR="/tmp/merlin-box-boot.lock"
# 调用来自哪个脚本
readonly FROM="${1:-wan_start}"
# 脚本中传过来的参数
readonly P1="${2:-0}"
readonly P2="${3:-connected}"

#######################################
# 日志记录函数
#######################################
log_msg() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOGFILE"
    logger -t "merlin-box-boot" "$1"
}

#######################################
# 获取执行锁（防止脚本并发执行）
#######################################
lock()
{
    if ! mkdir "$LOCK_DIR" 2>/dev/null; then
        log_msg "已有实例正在运行，本次退出。"
        exit 0
    fi

    # 无论正常退出还是异常退出，都自动释放锁
    trap 'unlock' EXIT INT TERM
}

#######################################
# 释放执行锁
#######################################
unlock()
{
    rmdir "$LOCK_DIR" 2>/dev/null
}

########################################
# 等待网络连接函数
########################################
wait_network()
{
    i=1

    while [ $i -le 50 ]; do

        if ping -c 1 -W 2 223.5.5.5 >/dev/null 2>&1; then
            log_msg "网络已连接"
            return 0
        fi

        log_msg "等待网络 ($i/50)"
        sleep 2

        i=$((i + 1))
    done

    log_msg "等待网络超时"
    return 1
}

########################################
# 等待时间同步正确
########################################
wait_time_sync()
{
    i=1

    while [ $i -le 50 ]; do

        if [ "$(date +%Y)" -ge "$INSTALL_YEAR" ]; then
            log_msg "时间已同步"
            return 0
        fi

        log_msg "等待时间同步 ($i/50)"
        sleep 2

        i=$((i + 1))
    done

    log_msg "等待时间同步超时"
    return 1
}

log_msg "收到触发事件: FROM=$FROM, P1=$P1, P2=$P2"

# wan 连接事件触发，重新拨号后merlin-box重启
if { [ "$FROM" = "wan_event" ] && [ "$P1" = "0" ] && [ "$P2" = "connected" ]; } || [ "$FROM" = "wan_start" ]; then

    # 开始执行脚本
    lock

    wait_network

    wait_time_sync

    sleep 2

    log_msg "WAN 事件匹配成功，准备重启 merlin-box..."

    if cd "$MD_ROOT_DIR"; then
        log_msg "已进入目录: $MD_ROOT_DIR，开始执行 ./merlin-box.sh restart"
        ./merlin-box.sh restart >> "$LOGFILE" 2>&1
        EXIT_CODE=$?
        log_msg "merlin-box 重启命令执行完毕 (退出码: $EXIT_CODE)"
    else
        log_msg "错误: 无法进入目录 $MD_ROOT_DIR，启动中断！"
    fi
fi
