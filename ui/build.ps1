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

$env:GOOS = "linux"
$env:GOARCH = "arm64"
$env:CGO_ENABLED = "0"
go build -ldflags="-s -w" -o ../../bin/merlin-box .

#使用wsl在里面调用 upx --lzma --ultra-brute 压缩 ../../bin/merlin-box
wsl upx --lzma --ultra-brute ../../bin/merlin-box

#============前端============
cd ../front
gulp build

#按任意键继续...
Read-Host -Prompt "Press Enter to continue"
