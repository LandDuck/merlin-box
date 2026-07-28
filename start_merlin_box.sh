#!/bin/sh

# MIT License
#
# Copyright (c) 2026 LandDuck <https://github.com/LandDuck/>
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO TECHNICAL PRESERVATION, OR FITNESS
# FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

# 此文件主要用于在路由器启动时自动启动 merlin-box，或者在 WAN 连接事件触发时重新启动 merlin-box。

# 日志
readonly LOGFILE="/tmp/merlin-box-boot.log"
# merlin-box 根目录，脚本会自动修改
readonly MD_ROOT_DIR="/jffs/xxxxxxx"
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

log_msg "收到触发事件: FROM=$FROM, P1=$P1, P2=$P2"

# wan 连接事件触发，重新拨号后merlin-box重启
if { [ "$FROM" = "wan_event" ] && [ "$P1" = "0" ] && [ "$P2" = "connected" ]; } || [ "$FROM" = "wan_start" ]; then

    # 开始执行脚本
    lock

    wait_network

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
