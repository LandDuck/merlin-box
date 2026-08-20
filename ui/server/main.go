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
	"errors"
	"flag"
	"fmt"
	"log"
	"merlin-box-ui/global"
	"merlin-box-ui/handlers"
	"merlin-box-ui/middleware"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/go-chi/chi/v5"
)

// printVersion 打印程序版本信息。
func printVersion() {
	fmt.Println(global.Version)
}

// parseCommandLine 解析命令行参数，返回端口号、是否退出标志和错误信息。
func parseCommandLine() (int, bool, error) {
	if len(os.Args) > 1 && os.Args[1] == "version" {
		printVersion()
		return 0, true, nil
	}

	flagSet := flag.NewFlagSet(os.Args[0], flag.ContinueOnError)
	flagSet.SetOutput(os.Stdout)

	port := flagSet.Int("port", global.DefaultPort, "HTTP server port")
	versionFlag := flagSet.Bool("version", false, "Print version and exit")
	flagSet.Usage = func() {
		command := filepath.Base(os.Args[0])
		_, _ = fmt.Fprintf(flagSet.Output(), "Usage:\n  %s [--port PORT]\n  %s version\n\nOptions:\n", command, command)
		flagSet.PrintDefaults()
	}

	if err := flagSet.Parse(os.Args[1:]); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return 0, true, nil
		}
		return 0, false, err
	}

	if *versionFlag {
		printVersion()
		return 0, true, nil
	}

	if *port < 1 || *port > 65535 {
		return 0, false, fmt.Errorf("invalid port: %d", *port)
	}

	return *port, false, nil
}

// main 函数是程序的入口点，负责启动 HTTP 服务器并设置路由和中间件。
func main() {
	port, shouldExit, err := parseCommandLine()
	if err != nil {
		log.Fatal(err)
	}
	if shouldExit {
		return
	}

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

	// 启动 HTTP 服务器，监听端口
	address := ":" + strconv.Itoa(port)
	if err := http.ListenAndServe(address, r); err != nil {
		log.Fatal(err)
	}
}
