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

package main

import (
	"log"
	"merlin-box-ui/global"
	"merlin-box-ui/handlers"
	"merlin-box-ui/middleware"
	"net/http"
	"os"

	"path/filepath"

	"github.com/go-chi/chi/v5"
)

// main 函数是程序的入口点，负责启动 HTTP 服务器并设置路由和中间件。
func main() {
	println("Hello, Merlin Box UI!")

	r := chi.NewRouter()

	// 全局中间件
	r.Use(middleware.Auth)

	// 根据环境变量选择静态资源目录
	staticDir := "./wwwroot"
	if os.Getenv("APP_ENV") == global.EnvDev {
		staticDir = "./../front"
	} else {
		global.CurrentEnv = global.EnvProd
	}

	// 默认首页和静态资源
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
	})
	r.Handle("/*", http.FileServer(http.Dir(staticDir)))

	// API
	r.Post("/api/login", handlers.Login)
	r.Post("/api/init", handlers.Init)
	r.Post("/api/status", handlers.Status)
	r.Post("/api/save_path", handlers.SavePath)
	r.Post("/api/test", handlers.Test)

	// 启动 HTTP 服务器，监听端口 8080
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatal(err)
	}
}
