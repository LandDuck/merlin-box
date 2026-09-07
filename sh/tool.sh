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

# 不可单独运行, 必须在 merlin-box.sh 中调用


#=========================================
#调用 compress_executable_with_upx 压缩sing-box 可执行文件
#=========================================
compress_singbox() {

  # 验证一下是否在路由器中， 如果在， 不执行，给出警告
  if is_running_on_router; then
    print_warning "在路由器中运行，跳过压缩 sing-box 可执行文件，请在 PC 或服务器上运行此脚本以构建 sing-box"
    return
  fi

  local singbox_path="${CUR_DIR}/bin/sing-box"
  compress_executable_with_upx "$singbox_path"
}

#=========================================
#调用 compress_executable_with_upx 压缩smartdns 可执行文件
#=========================================
compress_smartdns() {

  # 验证一下是否在路由器中， 如果在， 不执行，给出警告
  if is_running_on_router; then
    print_warning "在路由器中运行，跳过压缩 smartdns 可执行文件，请在 PC 或服务器上运行此脚本以构建 smartdns"
    return
  fi

  local smartdns_path="${CUR_DIR}/bin/smartdns"
  compress_executable_with_upx "$smartdns_path"
}

#=========================================
#下载一个文件
# 参数1: 下载的URL
# 参数2: 保存的目标路径
#=========================================
download_file() {

  local url="$1"
  local target_path="$2"

  if [ -z "$url" ] || [ -z "$target_path" ]; then
    print_error "下载文件失败: URL 或目标路径为空"
    return 1
  fi

  print_normal "下载文件: $url 到 $target_path"

  if type curl >/dev/null 2>&1; then
    print_normal "检测到 curl，使用 SOCKS5 代理(127.0.0.1:65001)下载文件"
    curl --fail --silent --show-error --location --proxy "socks5h://127.0.0.1:65001" -o "$target_path" "$url"
    if [ $? -ne 0 ]; then
      print_error "下载 $url 失败"
      return 1
    fi
  else
    print_normal "未检测到 curl，使用 wget 直连下载规则文件"
    wget --no-hsts -O "$target_path" "$url"
    if [ $? -ne 0 ]; then
      rm -rf "${tmp_dir}"
      print_error "下载 $url 失败"
      return 1
    fi
  fi

  print_success "下载完成: $target_path"

  return 0
}
#=========================================
# 更新 merlin-box
#=========================================
update(){
    print_line "更新 merlin-box"

    # 检测是否在路由器中, 如果不在不执行
    print_normal "检测是否在路由器中运行"
    if ! is_running_on_router; then
        print_error "未在路由器中运行，无法更新 merlin-box，请在路由器中运行此脚本以更新 merlin-box"
        exit 1
    else
      print_success "检测到在路由器中运行，继续更新 merlin-box"
    fi

    print_normal "检测仓库最新版本"
    local latest_version=$(get_github_latest_release "LandDuck/merlin-box")
    if [ -z "$latest_version" ]; then
        print_error "获取最新版本失败"
        exit 1
    fi
    print_success "最新版本: $latest_version"
    if [ "$latest_version" = "$SCRIPT_VERSION" ]; then
        print_success "当前已是最新版本: $SCRIPT_VERSION"
        exit 0
    else
        print_normal "当前版本: $SCRIPT_VERSION, 最新版本: $latest_version"
    fi

    print_normal "检测是否为UI版本"
    local noui=""
    # merlin-box 可执行文件路径
    local merlinbox_bin="${CUR_DIR}/bin/merlin-box"
    #如果 merlin-box 可执行文件不存在，noui='-noui'
    if [ ! -f "$merlinbox_bin" ]; then
        print_warning "merlin-box 可执行文件不存在，当前为非UI版本"
        noui="-noui"
    else
        print_normal "merlin-box 可执行文件存在，当前为UI版本"
    fi

    print_normal "检测CPU架构"
    local smartdns_bin="${CUR_DIR}/bin/smartdns"
    local arch
    arch=$(get_executable_arch "$smartdns_bin")
    print_success "检测到CPU架构: $arch"

    #如果arch不是 arm或arm64, 则提示错误
    if [ "$arch" != "arm" ] && [ "$arch" != "arm64" ]; then
        print_error "不支持的CPU架构: $arch, 仅支持 arm 或 arm64"
        exit 1
    fi

    #https://github.com/LandDuck/merlin-box/releases/download/v1.0.7/merlin-box-arm64_1.0.7.tar.gz
    local download_url="https://github.com/LandDuck/merlin-box/releases/download/v${latest_version}/merlin-box${noui}-${arch}_${latest_version}.tar.gz"
    print_normal "下载地址: $download_url"
    local tmp_dir="${CUR_DIR}/.tmp-update-merlin-box"
    rm -rf "${tmp_dir}"
    mkdir -p "${tmp_dir}"
    if [ $? -ne 0 ]; then
      print_error "创建临时目录失败: ${tmp_dir}"
      exit 1
    fi

    local tmp_file="${tmp_dir}/merlin-box.tar.gz"
    if ! download_file "$download_url" "$tmp_file"; then
      rm -rf "${tmp_dir}"
      print_error "下载 merlin-box 失败"
      exit 1
    fi

    print_success "下载完成: $tmp_file"
    print_normal "解压下载的文件"
    tar -xzf "$tmp_file" -C "$tmp_dir"
    if [ $? -ne 0 ]; then
      rm -rf "${tmp_dir}"
      print_error "解压 merlin-box 失败"
      exit 1
    fi

    print_success "解压完成"

    print_normal "复制文件"
    #bin目录、scripts目录、sh目录
    #如果是UI版本, 再移动wwwroot目录
    #LICENSE文件、merlin-box.sh文件、README.md文件、README.zh-CN.md文件、RELEASE.md文件、start_merlin_box.sh文件
    cp -rf "${tmp_dir}/bin"/* "${CUR_DIR}/bin/"
    cp -rf "${tmp_dir}/scripts"/* "${CUR_DIR}/scripts/"
    cp -rf "${tmp_dir}/sh"/* "${CUR_DIR}/sh/"
    if [ "$noui" = "" ]; then
      cp -rf "${tmp_dir}/wwwroot"/* "${CUR_DIR}/wwwroot/"
    fi
    cp -rf "${tmp_dir}/LICENSE" "${CUR_DIR}/LICENSE"
    cp -rf "${tmp_dir}/merlin-box.sh" "${CUR_DIR}/merlin-box.sh"
    cp -rf "${tmp_dir}/README.md" "${CUR_DIR}/README.md"
    cp -rf "${tmp_dir}/README.zh-CN.md" "${CUR_DIR}/README.zh-CN.md"
    cp -rf "${tmp_dir}/RELEASE.md" "${CUR_DIR}/RELEASE.md"
    cp -rf "${tmp_dir}/start_merlin_box.sh" "${CUR_DIR}/start_merlin_box.sh"

    rm -rf "${tmp_dir}"
    print_success "更新完成，重启相关服务后生效"

}

#=========================================
# 更新规则文件
#=========================================
update_rules() {
  print_line "更新规则文件"
  # 检测是否在路由器中, 在的话直接下载本项目的规则文件到 res 目录
  if is_running_on_router; then
    print_normal "检测到在路由器中运行，直接下载规则文件到 res 目录"

    # 需要检测是否存在 PID_FILE 文件，如果不存在，证明没有运行，不能更新规则文件
    if ! is_running; then
      print_error "merlin-box 可能未运行，请先启动 merlin-box 后再更新规则文件"
      exit 1
    fi

    # https://raw.githubusercontent.com/LandDuck/merlin-box/main/res/chn-ip4.txt
    # https://raw.githubusercontent.com/LandDuck/merlin-box/main/res/chn-ip6.txt
    # https://raw.githubusercontent.com/LandDuck/merlin-box/main/res/chn-site.txt

    local tmp_dir="${CUR_DIR}/.tmp-update-rules"
    rm -rf "${tmp_dir}"
    mkdir -p "${tmp_dir}"
    if [ $? -ne 0 ]; then
      print_error "创建临时目录失败: ${tmp_dir}"
      exit 1
    fi

    for rule in chn-ip4 chn-ip6 chn-site; do
      local target_file="${CUR_DIR}/res/${rule}.txt"
      local tmp_file="${tmp_dir}/${rule}.txt"
      if download_file "https://raw.githubusercontent.com/LandDuck/merlin-box/main/res/${rule}.txt" "${tmp_file}"; then
        cp "${tmp_file}" "${target_file}"
        if [ $? -ne 0 ]; then
          rm -rf "${tmp_dir}"
          print_error "写入 ${target_file} 失败"
          exit 1
        fi
      else
        rm -rf "${tmp_dir}"
        print_error "下载 ${rule}.txt 失败"
        exit 1
      fi
    done

    rm -rf "${tmp_dir}"

  else
    print_warning "未在路由器中运行，使用 python3 ./tools/update-rules/main.py 更新规则文件"
    if command -v python3 >/dev/null 2>&1; then
      python3 ./tools/update-rules/main.py
    else
      print_error "未检测到 python，请先安装 python"
      exit 1
    fi
  fi

  print_success "规则文件更新完成"
}

#==========================================
# 提取某个可执行文件的CPU架构
# 参数1: 可执行文件路径
# 返回值: 输出架构名称 (arm64, arm, x86_64, x86, unknown)
#==========================================
get_executable_arch() {
  local executable_path="$1"
  local file_info
  local elf_machine
  local arch="unknown"

  if [ ! -f "$executable_path" ]; then
      print_error "错误: 可执行文件不存在: $executable_path"
      echo "unknown"
      return 1
  fi

  # 优先使用 file
  if type file >/dev/null 2>&1; then
      file_info=$(file -b "$executable_path" 2>/dev/null)

      case "$file_info" in
          *aarch64*|*AArch64*|*ARM\ aarch64*)
              arch="arm64"
              ;;
          *ARM*)
              arch="arm"
              ;;
          *x86-64*|*x86_64*)
              arch="x86_64"
              ;;
          *80386*)
              arch="x86"
              ;;
      esac

  # file 不存在时使用 hexdump
  elif type hexdump >/dev/null 2>&1; then
      elf_machine=$(hexdump -s 18 -n 2 -e '2/1 "%02x"' "$executable_path" 2>/dev/null)

      case "$elf_machine" in
          b700)
              arch="arm64"
              ;;
          2800)
              arch="arm"
              ;;
          3e00)
              arch="x86_64"
              ;;
          0300)
              arch="x86"
              ;;
      esac
  fi

  echo "$arch"
}

#=========================================
# 下载 smartdns 可执行文件
# arm64 https://github.com/pymumu/smartdns/releases/download/Release48.4/smartdns-aarch64
# arm  https://github.com/pymumu/smartdns/releases/download/Release48.4/smartdns-arm
# 下载到 bin 目录下 smartdns
#=========================================
download_smartdns() {
  local smartdns_version="${1:-}"
  local arch="${2:-}"

  print_normal "准备下载 smartdns 可执行文件，版本(传入参数): ${smartdns_version}, 架构(传入参数): ${arch}"

  # 验证一下是否在路由器中， 如果在， 不执行，给出警告
  if is_running_on_router; then
    print_warning "在路由器中运行，跳过下载 smartdns 可执行文件，请在 PC 或服务器上运行此脚本以下载 smartdns"
    return
  fi

  if [ -z "$smartdns_version" ]; then
    read -p "请输入要下载的 smartdns 版本 (例如 48.4): " smartdns_version
  fi

  if [ -z "$arch" ]; then
    read -p "请输入要下载的架构 (arm64 或 arm): " arch
  fi

  if [ "$arch" != "arm64" ] && [ "$arch" != "arm" ]; then
    print_error "错误: 不支持的架构 '$arch'，请使用 arm64 或 arm"
    exit 1
  fi

  # 0 smartdns 可执行文件路径
  local file_path="${CUR_DIR}/bin/smartdns"

  # 1. 提取版本号 (通过执行 -v 输出提取 Release 后的数字)
  local raw_version_info
  raw_version_info=$("$file_path" -v 2>&1)
  local raw_version
  raw_version=$(echo "$raw_version_info" | grep -oP 'Release\K[0-9.]+' || echo "$raw_version_info" | sed -n 's/.*Release\([0-9.]*\).*/\1/p')

  # 2. 提取架构
  local raw_arch
  raw_arch=$(get_executable_arch "$file_path")

  print_warning "当前 smartdns 版本: ${raw_version} (${raw_arch})，目标版本: ${smartdns_version} (${arch})"

  # 如果版本号和架构相同，则跳过下载
  if [ "$raw_version" = "$smartdns_version" ] && [ "$raw_arch" = "$arch" ]; then
    print_success "smartdns 已是最新版本: ${raw_version} (${raw_arch})，无需下载"
    return
  fi

  print_line "下载 smartdns 可执行文件"

  # 构建下载 URL
  if [ "$arch" = "arm64" ]; then
    smartdns_url="https://github.com/pymumu/smartdns/releases/download/Release${smartdns_version}/smartdns-aarch64"
  else
    smartdns_url="https://github.com/pymumu/smartdns/releases/download/Release${smartdns_version}/smartdns-arm"
  fi

  # 下载到 bin 目录下 smartdns
  # mkdir -p "${CUR_DIR}/bin"
  wget -O "${file_path}" "$smartdns_url"

  # 检查下载是否成功
  if [ $? -ne 0 ]; then
    print_error "下载 smartdns 失败，请检查版本号和网络连接"
    exit 1
  fi

  # 压缩 smartdns 可执行文件
  compress_smartdns

  print_success "smartdns 可执行文件下载完成: ${file_path}"

}

#=========================================
# 将订阅链接转换为 sing-box 配置文件
#=========================================
subscription_to_singbox_config() {

  local subscription_url="$1"
  if [ -z "$subscription_url" ]; then
    print_error "错误: 订阅链接不能为空"
    exit 1
  fi

  print_normal "将订阅链接转换为 sing-box 配置文件，Url=$subscription_url"

  # merlin-box 可执行文件路径
  local merlinbox_bin="${CUR_DIR}/bin/merlin-box"
  # sub2box Python 脚本路径
  local sub2box_py="${CUR_DIR}/tools/sub2box/main.py"

  # 验证是否在路由器中运行，如果在，使用 merlin-box 可执行文件执行转换，否则使用 Python 脚本执行转换
  if is_running_on_router; then
    print_warning "在路由器中运行，使用 merlin-box 执行转换"
    if [ ! -f "$merlinbox_bin" ]; then
      print_error "merlin-box 可执行文件不存在，请先在 PC 上构建 merlin-box"
      exit 1
    fi
    "$merlinbox_bin" tool sub2box --url "$subscription_url"
  else
    if command -v python3 >/dev/null 2>&1; then
      print_warning "在 PC 上运行，使用 Python 脚本执行转换"
      python3 "$sub2box_py" "$subscription_url"
    else
      print_error "未检测到 python，请先安装 python"
      exit 1
    fi
  fi

}

#=========================================
# 构建 sing-box 可执行文件
#=========================================
build_singbox() {

  local singbox_version="${1:-}"
  local arch="${2:-}"

  print_normal "准备编译 sing-box 可执行文件，版本(传入参数): ${singbox_version}, 架构(传入参数): ${arch}"

  # 验证一下是否在路由器中， 如果在， 不执行，给出警告
  if is_running_on_router; then
    print_warning "在路由器中运行，跳过构建 sing-box 可执行文件，请在 PC 或服务器上运行此脚本以构建 sing-box"
    return
  fi

  if [ -z "$singbox_version" ]; then
      read -p "请输入要构建的 sing-box 版本 (例如 1.13.16): " singbox_version
  fi

  if [ -z "$arch" ]; then
      read -p "请输入要构建的架构 (arm64 或 arm): " arch
  fi

  if [ "$arch" != "arm64" ] && [ "$arch" != "arm" ]; then
    print_error "错误: 不支持的架构 '$arch'，请使用 arm64 或 arm"
    exit 1
  fi

  # 规范化版本号：确保 singbox_version 不带 v，tag_name 带有 v
  VERSION_NO_V="${singbox_version#v}"
  TAG_NAME="v${VERSION_NO_V}"

  # 0 sing-box 可执行文件路径
  local file_path="${CUR_DIR}/bin/sing-box"

  # 1. 获取版本原始信息 (尝试使用 version，如果不成功再尝试 -v)
  local raw_version_info
  raw_version_info=$("$file_path" version 2>&1)
  if [ $? -ne 0 ] || [ -z "$raw_version_info" ]; then
      raw_version_info=$("$file_path" -v 2>&1)
  fi
  local raw_version
  raw_version=$(echo "$raw_version_info" | grep -oP '(version|Release)\s*\K[0-9.]+' | head -n 1)

  # 2. 提取架构 (通过 file 命令解析 ELF 信息)
  local file_info
  file_info=$(file -b "$file_path")
  local raw_arch="unknown"

  case "$file_info" in
      *aarch64*|*ARM\ aarch64*)
          raw_arch="arm64"
          ;;
      *ARM*)
          raw_arch="arm"
          ;;
      *x86-64*)
          raw_arch="x86_64"
          ;;
      *80386*)
          raw_arch="x86"
          ;;
  esac

  print_warning "当前 sing-box 版本: ${raw_version} (${raw_arch})，目标版本: ${singbox_version} (${arch})"

  # 如果版本号和架构相同，则跳过下载
  if [ "$raw_version" = "$singbox_version" ] && [ "$raw_arch" = "$arch" ]; then
    print_success "sing-box 已是最新版本: ${raw_version} (${raw_arch})，无需下载"
    return
  fi

  # 检查工具集
  for cmd in git go tar; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      print_error "未检测到 $cmd，请先安装 $cmd"
      exit 1
    fi
  done

  # 开发阶段调试用的
  ### WORK_DIR=$CUR_DIR/tmp
  # 如果不存在， 创建工作目录
  ### mkdir -p "$WORK_DIR"
  # 开发阶段调试用的结束

  print_line "构建 sing-box 可执行文件"

  # 创建独立的工作临时目录，并在脚本退出/中断时自动清理
  WORK_DIR=$(mktemp -d -t singbox-build-XXXXXX)
  trap 'rm -rf "$WORK_DIR"' EXIT

  echo "工作目录: $WORK_DIR"
  cd "$WORK_DIR" || exit 1

  # 1. 下载 sing-box 源码
  print_line "正在克隆 sing-box (${TAG_NAME})..."
  if ! git clone --branch "$TAG_NAME" --depth 1 "https://github.com/SagerNet/sing-box.git" sing-box; then
   print_error "找不到标签为 ${TAG_NAME} 的 sing-box 源码，请检查版本号！"
   exit 1
  fi

  # 2. 读取 sing-box 要求的精确 cronet-go 版本号
  CD_SINGBOX="$WORK_DIR/sing-box"
  CRONET_GO_VERSION=$(cat "$CD_SINGBOX/.github/CRONET_GO_VERSION")

  if [ -z "$CRONET_GO_VERSION" ]; then
    print_error "未能在 .github/CRONET_GO_VERSION 中找到 cronet-go 版本配置"
    exit 1
  fi

  # 3. 按指定的 Commit/Tag 克隆 cronet-go 并拉取子模块
  print_line "正在克隆匹配的 cronet-go (${CRONET_GO_VERSION})..."
  mkdir -p cronet-go
  cd cronet-go || exit 1
  git init
  git remote add origin https://github.com/sagernet/cronet-go.git
  git fetch --depth=1 origin "$CRONET_GO_VERSION"
  git checkout FETCH_HEAD
  git submodule update --init --recursive --depth=1

  # 4. 初始化 keyring 并准备工具链环境
  print_line "准备 Chromium/musl 工具链..."
  rm -f ./naiveproxy/src/build/linux/sysroot_scripts/keyring.gpg
  GPG_TTY=/dev/null ./naiveproxy/src/build/linux/sysroot_scripts/generate_keyring.sh || true
  go run ./cmd/build-naive --target=linux/"${arch}" --libc=musl download-toolchain

  # 执行 build-naive env 并捕获原始输出
  ENV_OUTPUT=$(go run ./cmd/build-naive --target=linux/"${arch}" --libc=musl env)
  # echo "环境变量输出:"
  # echo "$ENV_OUTPUT"

  # 1. 提取 raw 变量
  RAW_CC=$(echo "$ENV_OUTPUT" | grep '^CC=' | cut -d'=' -f2-)
  RAW_CXX=$(echo "$ENV_OUTPUT" | grep '^CXX=' | cut -d'=' -f2-)
  RAW_LDFLAGS=$(echo "$ENV_OUTPUT" | grep '^CGO_LDFLAGS=' | cut -d'=' -f2-)
  RAW_QEMU=$(echo "$ENV_OUTPUT" | grep '^QEMU_LD_PREFIX=' | cut -d'=' -f2-)

  # 2. 剥离纯路径与标志（关键：在 grep 参数后加上 -- ）
  PURE_CC=$(echo "$RAW_CC" | awk '{print $1}')
  PURE_CXX=$(echo "$RAW_CXX" | awk '{print $1}')

  # 加上 -- 阻止 grep 解析开头的杠杠
  TARGET_FLAG=$(echo "$RAW_CC" | grep -o -E -- '--target=[^ ]*')
  SYSROOT_FLAG=$(echo "$RAW_CC" | grep -o -E -- '--sysroot=[^ ]*')

  # 3. 导出标准 CGO 环境变量
  export CC="${PURE_CC}"
  export CXX="${PURE_CXX}"
  export CGO_CFLAGS="${TARGET_FLAG} ${SYSROOT_FLAG}"
  export CGO_CXXFLAGS="${TARGET_FLAG} ${SYSROOT_FLAG}"
  export CGO_LDFLAGS="${RAW_LDFLAGS} ${TARGET_FLAG} ${SYSROOT_FLAG}"
  export QEMU_LD_PREFIX="${RAW_QEMU}"

  export CGO_ENABLED=1
  export GOOS=linux
  export GOARCH="${arch}"
  #如果是arm架构, 需要设置 GOARM=7
  if [ "$arch" = "arm" ]; then
    export GOARM=7
  fi

  # 5. 读取默认 Build Tags (如有) 或使用推荐 Tags
  cd "$CD_SINGBOX" || exit 1

  # merlin-box 使用这些就够了
  BUILD_TAGS="with_musl,with_quic,with_utls,with_naive_outbound"

  # 6. 开始编译 sing-box
  print_line "开始编译 sing-box..."
  #mkdir -p "${CUR_DIR}/bin"

  go build -v -trimpath \
    -tags "${BUILD_TAGS}" \
    -ldflags "-X github.com/sagernet/sing-box/constant.Version=${VERSION_NO_V} -s -w -buildid=" \
    -o "${file_path}" \
    ./cmd/sing-box

  # 调用压缩函数
  compress_singbox

  print_success "sing-box 可执行文件构建完成: ${file_path}"
}

# =========================================
# 构建UI
# =========================================
build_ui() {

    # 验证一下是否在路由器中， 如果在， 不执行，给出警告
    if is_running_on_router; then
      print_warning "在路由器中运行，跳过构建 UI，请在 PC 或服务器上运行此脚本以构建 UI"
      return
    fi

    print_line "构建 UI"

    # 检查是否存在 go 命令
    if ! command -v go >/dev/null 2>&1; then
      print_error "未检测到 go，请先安装 go"
      exit 1
    fi

    # Server源码目录
    local server_src_dir="${CUR_DIR}/ui/server" #main.go
    # Server输出目录
    local server_output_bin="${CUR_DIR}/bin/merlin-box"
    # 前端目录
    local front_dir="${CUR_DIR}/ui/front"

    local arch="${1:-}"
    # 询问构建arm64还是arm
    if [ -z "$arch" ]; then
      read -p "请输入要构建的架构 (arm64 或 arm): " arch
    fi

    if [ "$arch" != "arm64" ] && [ "$arch" != "arm" ]; then
      print_error "错误: 不支持的架构 '$arch'，请使用 arm64 或 arm"
      exit 1
    fi

    print_normal "构建前端"

    # 构建前端
    (
      cd "$front_dir" || exit 1
      # 检测是否存在 node , 如果不存在，提示安装， 但不自动安装
      if ! command -v node >/dev/null 2>&1; then
        print_error "未检测到 node，请先安装 node"
        exit 1
      fi
      # 检测是否存在 yarn 和 gulp，如果不存在，提示安装， 但不自动安装
      if ! command -v yarn >/dev/null 2>&1; then
        print_error "未检测到 yarn，请先安装 yarn"
        exit 1
      fi
      if ! command -v gulp >/dev/null 2>&1; then
        print_error "未检测到 gulp，请先安装 gulp"
        exit 1
      fi
      # 检测是否存在 node_modules，如果不存在，执行 yarn install
      if [ ! -d "node_modules" ]; then
        print_normal "node_modules 不存在，执行 yarn install"
        yarn install
        if [ $? -ne 0 ]; then
          print_error "yarn install 失败，请检查网络连接和 yarn 配置"
          exit 1
        fi
      fi
      # 执行 gulp build
      gulp build
      if [ $? -ne 0 ]; then
        print_error "gulp build 失败，请检查 gulp 配置和前端代码"
        exit 1
      fi
    )

    if [ $? -ne 0 ]; then
      print_error "构建 UI 前端失败"
      exit 1
    fi

    # 1. 提取版本号 (通过执行 version 提取最后一行的纯数字版本号)
    local raw_version_info
    raw_version_info=$("$server_output_bin" version 2>&1)
    local raw_version
    raw_version=$(echo "$raw_version_info" | sed -n 's/.*\([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\).*/\1/p' | tail -n 1)

    # 2. 提取架构 (通过 file 命令解析 ELF 信息)
    local file_info
    file_info=$(file -b "$server_output_bin")
    local raw_arch="unknown"
    case "$file_info" in
        *aarch64*|*ARM\ aarch64*)
            raw_arch="arm64"
            ;;
        *ARM*)
            raw_arch="arm"
            ;;
        *x86-64*)
            raw_arch="x86_64"
            ;;
        *80386*)
            raw_arch="x86"
            ;;
    esac
    print_warning "当前 merlin-box 版本: ${raw_version} (${raw_arch})，目标版本: ${SCRIPT_VERSION} (${arch})"

    # 如果版本号和架构相同，则跳过下载
    if [ "$raw_version" = "$SCRIPT_VERSION" ] && [ "$raw_arch" = "$arch" ]; then
      print_success "merlin-box 已是最新版本，无需构建"
      return
    fi

    print_normal "构建服务器端"

    # 构建服务器端
    (
      cd "$server_src_dir" || exit 1
      #将 SCRIPT_VERSION 传递给 go build
      GOOS=linux GOARCH="$arch" CGO_ENABLED=0 go build -ldflags="-s -w -X github.com/LandDuck/merlin-box/global.Version=${SCRIPT_VERSION}" -o "$server_output_bin" .
    )
    if [ $? -ne 0 ]; then
      print_error "构建 UI 服务器端失败"
      exit 1
    fi

    # 验证一下,如果存在, 则压缩 UI 服务器端可执行文件
    if [ -f "$server_output_bin" ]; then
      compress_executable_with_upx "$server_output_bin"
    else
      print_error "构建 UI 服务器端可执行文件失败: ${server_output_bin} 不存在"
      exit 1
    fi

    print_success "UI 构建完成"

}

# =========================================
# 获取 GitHub 仓库的最新 Release 版本号
# 参数: 仓库路径 (例如: owner/repo)
# =========================================
get_github_latest_release() {
    local repo="$1"

    # 参数检查
    if [ -z "$repo" ]; then
        echo "错误: 请提供仓库路径 (例如: owner/repo)" >&2
        return 1
    fi

    print_normal "准备获取 GitHub 仓库 [${repo}] 的最新 Release 版本号">&2

    # 1. 发送请求提取 tag_name
    local tag

    # 是否在路由器中
    if is_running_on_router; then
      print_normal "在路由器中运行，使用本机sock5代理">&2
      tag=$(curl -fsS --proxy "socks5h://127.0.0.1:65001" "https://api.github.com/repos/${repo}/releases/latest" \
              | grep -o '"tag_name": *"[^"]*"' \
              | head -n 1 \
              | sed 's/"tag_name": *"\([^"]*\)"/\1/')
    else
      print_normal "在PC上运行，使用本机直连">&2
      tag=$(curl -fsS  "https://api.github.com/repos/${repo}/releases/latest" \
              | grep -o '"tag_name": *"[^"]*"' \
              | head -n 1 \
              | sed 's/"tag_name": *"\([^"]*\)"/\1/')
    fi

    # 2. 纯数字版本号清洗 (去除 Release、v 等字母前缀/后缀，仅保留数字和 .)
    local version
    version=$(echo "$tag" | sed 's/[^0-9.]*//g')

    # 验证提取结果
    if [ -n "$version" ]; then
        echo "$version"
        return 0
    else
        print_error "错误: 无法获取 [${repo}] 的 Release 版本" >&2
        return 1
    fi
}

# ==========================================
# 使用upx压缩 一个可执行文件
# 接收一个参数：要压缩的可执行文件路径
# ==========================================
compress_executable_with_upx() {
    local executable_path="$1"

    if [ ! -f "$executable_path" ]; then
        print_error "❌ 错误：指定的可执行文件不存在：$executable_path"
        return 1
    fi

    if ! command -v upx >/dev/null 2>&1; then
        print_warning "⚠️ 警告：未检测到 upx 工具，无法进行压缩。请先安装 upx。https://github.com/upx/upx/releases "
        return 1
    fi

    print_normal "⏳ 正在使用 upx 压缩可执行文件：$executable_path"
    upx --lzma --ultra-brute "$executable_path" #--lzma启动时会稍微慢一些
    #upx --best "$executable_path"

    if [ $? -eq 0 ]; then
        print_success "✅ 压缩完成：$executable_path"
    else
        print_error "❌ 压缩失败，请检查 upx 输出信息。"
        return 1
    fi
}

# =========================================
# 启动WEBUI服务
# =========================================
start_server(){

  stop_server

  print_line "starting server"

  local server_bin="${CUR_DIR}/bin/merlin-box"
  if [ ! -f "$server_bin" ]; then
    print_error "merlin-box 可执行文件不存在，请先构建 UI"
    exit 1
  fi

  # 第一个参数是端口，如果没传入使用 8080
  local port="${1:-8080}"

  #启动命令 merlin-box server --port 8080. 注意后台运行
  nohup "$server_bin" server --port "$port" > /dev/null 2>&1 &
  if [ $? -eq 0 ]; then
    print_success "✅ WEBUI 服务已启动，端口: $port"
  else
    print_error "❌ WEBUI 服务启动失败，请检查 merlin-box 可执行文件"
    exit 1
  fi

}


# ========================================
# 停止WEBUI服务
# ========================================
stop_server(){
  print_line "stopping server"

  # 与 stop_smartdns 保持一致，直接按进程名查找并优雅/强制停止
  local server_bin="${CUR_DIR}/bin/merlin-box"

  if ps | grep -v grep | grep -q "$server_bin"; then
    print_normal "⚠️ 侦测到正在运行的 WEBUI 服务实例，正在尝试停止..."
    killall -15 merlin-box 2>/dev/null
    sleep 1
    killall -9 merlin-box 2>/dev/null
    sleep 1
    print_success "✅ WEBUI 服务已成功停止。"
  else
    print_normal "🔍 未发现运行中的 WEBUI 服务实例，无需停止。"
  fi
}

# =========================================
# 打包为 tar.gz 文件
# =========================================
package() {

  local arch="${1:-}"
  if [ -z "$arch" ]; then
    read -p "请输入要打包的架构 (arm64 或 arm): " arch
  fi

  print_normal " 准备处理 smartdns "
  local smartdns_version=$(get_github_latest_release "pymumu/smartdns")
  print_warning "远程仓库最新版本: $smartdns_version"
  download_smartdns "$smartdns_version" "$arch"

  print_normal " 准备处理 singbox "
  local singbox_version=$(get_github_latest_release "sagernet/sing-box")
  print_warning "远程仓库最新版本: $singbox_version"
  build_singbox "$singbox_version" "$arch"

  print_normal " 准备处理 merlinbox "
  build_ui "$arch"

  print_normal " 打包为 tar.gz 文件 "
  local package_name="merlin-box-${arch}_${SCRIPT_VERSION}.tar.gz"
  local package_name_noui="merlin-box-noui-${arch}_${SCRIPT_VERSION}.tar.gz"
  local package_dir="${CUR_DIR}/dist"

  mkdir -p "$package_dir"
  tar -czf "${package_dir}/${package_name}" -C "${CUR_DIR}" --exclude='conf/logs' bin conf db res scripts sh wwwroot *.sh LICENSE *.md
  tar -czf "${package_dir}/${package_name_noui}" --exclude='bin/merlin-box' --exclude='conf/logs' -C "${CUR_DIR}" bin conf res scripts sh *.sh LICENSE *.md

  print_success "✅ 打包完成: ${package_dir}/${package_name} 和 ${package_dir}/${package_name_noui}"

}
