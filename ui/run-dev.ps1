# merlin-box - A sing-box + smartdns routing and proxy script solution for ASUSWRT-Merlin routers.
# Copyright (C) 2026 LandDuck <https://github.com/LandDuck/>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

#============服务端============
cd server

# 设置应用环境
$env:APP_ENV = "development"

# 检查是否安装了 air（Go 热重载工具）
if (-not (Get-Command air -ErrorAction SilentlyContinue)) {
    Write-Host "正在安装 air（Go 热重载工具）..."
    go install github.com/air-verse/air@latest
}

# 启动 Go 后端（air 监控代码变化自动重启，编译时带 development tag）
Start-Process -NoNewWindow powershell -ArgumentList @(
    "-ExecutionPolicy", "Bypass",
    "-NoProfile",
    "-Command", "air --build.cmd 'go build -tags development -o ./tmp/main.exe .'"
)

#============前端============
cd ../front
# 监控前端变化
gulp watch
