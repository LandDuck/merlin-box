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

package server

import (
	"flag"
	"fmt"
	"io"
	"merlin-box-ui/global"
	"merlin-box-ui/handlers"
	logger "merlin-box-ui/helper/log"
	"merlin-box-ui/middleware"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/go-chi/chi/v5"
)

// startHTTPServer 启动 HTTP 服务器
func startHTTPServer(port int) {
	logger.Debug("Starting HTTP server on port ", port)

	router := chi.NewRouter()

	router.Use(middleware.Auth)

	staticDir := "./wwwroot"
	if os.Getenv("APP_ENV") == global.EnvDev {
		staticDir = "./../front"
	} else {
		global.CurrentEnv = global.EnvProd
	}
	logger.Debug("Using static directory: ", staticDir)

	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
	})
	router.Handle("/*", http.FileServer(http.Dir(staticDir)))

	router.Post("/api/login", handlers.Login)
	router.Post("/api/init", handlers.Init)
	router.Post("/api/status", handlers.Status)
	router.Post("/api/logout", handlers.Logout)
	router.Post("/api/get_device_control_config", handlers.GetDeviceControlConfig)
	router.Post("/api/save_device_control_config", handlers.SaveDeviceControlConfig)
	router.Post("/api/start", handlers.Start)
	router.Post("/api/stop", handlers.Stop)
	router.Post("/api/restart", handlers.Restart)
	router.Post("/api/service_log", handlers.GetServiceLog)

	//router.Post("/api/save_path", handlers.SavePath)
	//router.Post("/api/test", handlers.Test)

	logger.Success("HTTP server is running on port ", port)

	address := ":" + strconv.Itoa(port)
	if err := http.ListenAndServe(address, router); err != nil {
		logger.Error("HTTP server failed: ", err)
		os.Exit(1)
	}
}

// RunServer 运行 HTTP 服务器
func RunServer(args []string) error {
	logger.Debug("Initializing server command with args: ", args)
	flagSet := flag.NewFlagSet("server", flag.ContinueOnError)
	flagSet.SetOutput(io.Discard)

	port := flagSet.Int("port", global.DefaultPort, "HTTP server port")
	if err := flagSet.Parse(args); err != nil {
		logger.Warn("usage: ", filepath.Base(os.Args[0]), " server --port <port>")
		logger.Error("invalid server arguments: ", err)
		return fmt.Errorf("usage: %s server --port <port>", filepath.Base(os.Args[0]))
	}
	if flagSet.NArg() > 0 {
		logger.Warn("server command does not accept positional arguments: ", flagSet.Args())
		return fmt.Errorf("server command does not accept positional arguments: %v", flagSet.Args())
	}
	if *port < 1 || *port > 65535 {
		logger.Warn("invalid port: ", *port)
		return fmt.Errorf("invalid port: %d", *port)
	}

	startHTTPServer(*port)
	return nil
}
