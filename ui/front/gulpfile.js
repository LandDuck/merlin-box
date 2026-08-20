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

import * as esbuild from "esbuild";
import glob from "fast-glob";
import chokidar from "chokidar";
import path from "path";
import fs from "fs/promises";
import less from "less";

//开发代码源目录
const SRC = "scripts-dev";
//开发代码输出目录
const OUT = "scripts";
//开发less源文件
const LESS_ENTRY = "less/main.less";
//开发less输出文件
const CSS_OUTPUT = "css/main.css";

//build临时目录
const DIST = "dist";
//生产环境目录
const WWW_ROOT = "../wwwroot";

// page 依赖关系
const pageContexts = new Map();
// esbuild config
const esbuildConfig = {
    bundle: true,
    format: "iife",
    legalComments: "none",
    platform: "browser",
    target: "es2018",
    sourcemap: false,
    logLevel: "info",
    loader: {
        ".js": "jsx"
    }
}
// main context
let mainContext = null;

/**
 * 将驼峰命名转换
 * HomeIndex    => home-index
 * HomeIndex2   => home-index2
 * Error404     => error-404
 * @param str
 * @returns {string}
 */
function toKebabCase(str) {
    return str
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Za-z])([0-9]{3,})/g, '$1-$2')
        .toLowerCase();
}

/**
 * 扫描pages目录下的js文件
 * @returns {Promise<string[]>}
 */
async function scanPages() {
    return await glob(`${SRC}/pages/*.js`);
}

/**
 * 获取page输出路径
 * @param file
 * @returns {string}
 */
function pageOutput(file) {
    const name = path.basename(file, ".js");
    return path.join(
        OUT,
        "pages",
        toKebabCase(name) + ".js"
    );
}

/**
 * 创建page的esbuild context
 * @param file
 * @returns {Promise<void>}
 */
async function createPageContext(file) {
    const outfile = pageOutput(file);
    await fs.mkdir(path.dirname(outfile), {
        recursive: true
    });
    const ctx = await esbuild.context({
        entryPoints: [
            file
        ],
        outfile,
        ...esbuildConfig
    });
    await ctx.watch();
    pageContexts.set(file, ctx);
    console.log("watch page:", file);
}


/**
 * 移除page的esbuild context
 * @param file
 * @returns {Promise<void>}
 */
async function removePage(file) {
    const ctx = pageContexts.get(file);
    if (ctx) {
        await ctx.dispose();
        pageContexts.delete(file);
    }
    const outfile = pageOutput(file);
    try {
        await fs.unlink(outfile);
        console.log("delete:", outfile);
    } catch {
    }
}

/**
 * 初始化pages的esbuild context
 * @returns {Promise<void>}
 */
async function initPages() {
    const pages = await scanPages();
    for (const page of pages) {
        await createPageContext(page);
    }
}

/**
 * 初始化main的esbuild context
 * @returns {Promise<void>}
 */
async function initMain() {
    mainContext = await esbuild.context({
        entryPoints: [
            `${SRC}/main.js`
        ],
        outfile: `${OUT}/main.js`,
        ...esbuildConfig
    });
    await mainContext.watch();
    console.log("watch main");
}

/**
 * 将dist目录下的文件拷贝到www目录
 */
async function copyToWww(file) {
    const wwwDir = WWW_ROOT;
    await fs.rm(wwwDir, {
        recursive: true,
        force: true
    });
    await fs.mkdir(wwwDir, {
        recursive: true
    });
    const files = await glob(`${DIST}/**/*`, {
        onlyFiles: true
    });
    for (const file of files) {
        const relativePath = path.relative(DIST, file);
        const destFile = path.join(wwwDir, relativePath);
        await fs.mkdir(path.dirname(destFile), {
            recursive: true
        });
        await fs.copyFile(file, destFile);
    }
    console.log("copy to wwwroot completed");
}

/**
 * 构建less文件
 * @param {{ minify?: boolean, output?: string }} [options]
 * @returns {Promise<void>}
 */
async function buildLess(options = {}) {
    const {minify = false, output = CSS_OUTPUT} = options;
    const input = await fs.readFile(LESS_ENTRY, "utf8");
    const result = await less.render(input, {
        filename: LESS_ENTRY,
        compress: minify
    });
    const css = result.css.replace(/\.\.\/\.\.\//g, "../");
    await fs.mkdir(path.dirname(output), {
        recursive: true
    });
    await fs.writeFile(output, css, "utf8");
    console.log("build:", output);
}

/**
 * 监听文件变化
 * @returns {Promise<void>}
 */
export async function watch() {
    await initMain();
    await initPages();
    //--------------------------pages--------------------------------
    const pagesDir = path.normalize(path.join(SRC, "pages"));
    const onPageChange = async (event, file) => {
        const normalizedFile = path.normalize(file);
        if (!normalizedFile.endsWith(".js")) {
            return;
        }
        if (path.dirname(normalizedFile) !== pagesDir) {
            return;
        }
        try {
            if (event === "add" || event === "change") {
                if (!pageContexts.has(normalizedFile)) {
                    await createPageContext(normalizedFile);
                }
                return;
            }
            if (event === "unlink") {
                await removePage(normalizedFile);
            }
        } catch (e) {
            console.error("page watch error:", e.message || e);
        }
    };
    chokidar.watch(`${SRC}/pages`, {
        ignoreInitial: true,
        usePolling: true,
        interval: 300
    }).on("all", onPageChange);
    //---------------------------less--------------------------------
    await buildLess();
    let lessDebounceTimer = null;
    const onLessChange = (event, file) => {
        clearTimeout(lessDebounceTimer);
        lessDebounceTimer = setTimeout(async () => {
            try {
                await buildLess();
            } catch (e) {
                console.error("less build error:", e.message || e);
            }
        }, 300);
    };
    chokidar.watch("less", {
        ignoreInitial: true,
        usePolling: true,
        interval: 300
    }).on("all", (event, file) => {
        if (file.endsWith(".less")) {
            onLessChange(event, file);
        }
    });
    console.log("watching...");
}

/**
 * 构建项目
 * @returns {Promise<void>}
 */
export async function build() {
    //清空dist目录
    await fs.rm(DIST, {
        recursive: true,
        force: true
    });
    //build main.js
    await esbuild.build({
        entryPoints: [
            `${SRC}/main.js`
        ],
        outfile: `${DIST}/${OUT}/main.js`,
        ...esbuildConfig,
        minify: true
    });
    //build pages
    const pages = await scanPages();
    for (const file of pages) {
        await esbuild.build({
            entryPoints: [
                file
            ],
            outfile: `${DIST}/${pageOutput(file)}`,
            ...esbuildConfig,
            minify: true
        });
    }
    //build less
    await buildLess({
        minify: true,
        output: `${DIST}/${CSS_OUTPUT}`
    });
    //复制scripts目录中除了main.js之外的所有文件到dist/scripts目录(不包含任何子目录)
    const scriptFiles = await glob(`${OUT}/*.*`, {
        ignore: [
            `${OUT}/main.js`
        ]
    });
    for (const file of scriptFiles) {
        const destFile = path.join(DIST, OUT, path.basename(file));
        await fs.mkdir(path.dirname(destFile), {
            recursive: true
        });
        await fs.copyFile(file, destFile);
    }
    //复制index.html和main.html, 同时替换里面的 '/merlin-box-ui/front/' 为 '/'
    const indexHtml = await fs.readFile("index.html", "utf8");
    const mainHtml = await fs.readFile("main.html", "utf8");
    await fs.writeFile(path.join(DIST, "index.html"), indexHtml.replace(/\/merlin-box-ui\/front\//g, "/"), "utf8");
    await fs.writeFile(path.join(DIST, "main.html"), mainHtml.replace(/\/merlin-box-ui\/front\//g, "/"), "utf8");
    //将dist目录下的文件拷贝到www目录
    await copyToWww();
    console.log("build completed");
}

//默认是构建项目
export default build;
