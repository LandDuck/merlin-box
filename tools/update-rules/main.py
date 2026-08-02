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

import os
import shutil
import requests
from pathlib import Path
import subprocess
import json
from netaddr import IPSet, IPNetwork, IPAddress

# 定义资源目录
BASE_DIR = Path(__file__).resolve().parent
RES_DIR = BASE_DIR / "res"
# 定义域名集合 SET
DOMAIN_SET = set()
IPV4_SET = IPSet()
IPV6_SET = IPSet()

def download(url, dest_path):
    """
    下载文件到指定路径
    :param url:  文件的URL
    :param dest_path:  文件保存的目标路径
    :return:  None
    """

    # 确保目标目录存在
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)

    # 下载文件
    response = requests.get(url)
    if response.status_code == 200:
        with open(dest_path, 'wb') as f:
            f.write(response.content)
        print(f"已下载: {dest_path}")
    else:
        print(f"下载失败: {url}，状态码: {response.status_code}")

def decompile_srs(srs_path, output_path):
    """
    解压缩 srs 文件
    :param srs_path:  srs 文件路径
    :param output_path:  输出文件路径
    :return:  None
    """

    # 调用 singbox 的 decompile 命令解压缩 srs 文件
    # BASE_DIR / "../../bin/sing-box" rule-set decompile srs_path -o output_path
    result = subprocess.run([str(BASE_DIR / "../../bin/sing-box"), "rule-set", "decompile", str(srs_path), "-o", str(output_path)], capture_output=True, text=True)

    if result.returncode == 0:
        print(f"已解压缩: {srs_path} -> {output_path}")
    else:
        print(f"解压缩失败: {srs_path}，错误信息: {result.stderr}")

def read_domain_to_set(file_path):
    """
    读取文件中的域名并添加到 DOMAIN_SET 中
    :param file_path:  文件路径
    :return:  None
    """
    ext_name = file_path.suffix.lower()
    if ext_name == ".txt":
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    DOMAIN_SET.add(line)
    if ext_name == ".conf":
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    # 按 / 分割，取索引为 1 的部分
                    parts = line.split('/')
                    if len(parts) > 1:
                        DOMAIN_SET.add(parts[1])
    if ext_name == ".json":
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # 提取顶层字段
            version = data.get("version", 1)
            rules_list = data.get("rules", [])
            print(f"规则版本: {version}, 共包含 {len(rules_list)} 组规则\n")
            for index, rule in enumerate(rules_list, 1):
                # 使用 .get() 避免缺少字段时 KeyError 报错，默认返回空列表 []
                domains = rule.get("domain", [])
                domain_suffixes = rule.get("domain_suffix", [])
                for domain in domains:
                    DOMAIN_SET.add(domain)
                for domain_suffix in domain_suffixes:
                    # 如果以 '.' 开头, 去掉开头的 '.'
                    if domain_suffix.startswith('.'):
                        domain_suffix = domain_suffix[1:]
                    DOMAIN_SET.add(domain_suffix)

def read_ip_to_set(file_path, ip_set):
    """
    读取文件中的IP并添加到指定的IP集合中
    :param file_path:  文件路径
    :param ip_set:  IP集合 (IPSet)
    :return:  None
    """
    ext_name = file_path.suffix.lower()
    if ext_name == ".txt":
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    try:
                        ip_set.add(IPNetwork(line))
                    except Exception as e:
                        print(f"无效的IP地址或网段: {line}, 错误信息: {e}")
    if ext_name == ".json":
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            rules_list = data.get("rules", [])
            for index, rule in enumerate(rules_list, 1):
                # 使用 .get() 避免缺少字段时 KeyError 报错，默认返回空列表 []
                ips = rule.get("ip_cidr", [])
                for ip in ips:
                    if ip_set is IPV4_SET and ':' in ip:
                        continue  # 跳过 IPv6 地址
                    if ip_set is IPV6_SET and ':' not in ip:
                        continue  # 跳过 IPv4 地址
                    try:
                        ip_set.add(IPNetwork(ip))
                    except Exception as e:
                        print(f"无效的IP地址或网段: {ip}, 错误信息: {e}")

def main():
    """
    程序实现从
    域名
    https://github.com/qxzg/Actions/blob/3.0/fancyss_rules/chnlist.txt
    https://github.com/felixonmars/dnsmasq-china-list/blob/master/accelerated-domains.china.conf
    https://github.com/SagerNet/sing-geosite/blob/rule-set/geosite-cn.srs
    ip
    https://github.com/SagerNet/sing-geoip/blob/rule-set/geoip-cn.srs
    https://github.com/gaoyifan/china-operator-ip/blob/ip-lists/china.txt
    https://github.com/gaoyifan/china-operator-ip/blob/ip-lists/china6.txt
    这些地方下载数据到 ./res/中, 同时读取并合并这些数据, 最终将结果写入 ../../res/chn-ip4.txt, ../../res/chn-ip6.txt, ../../res/chn-site.txt (路径为相对当前脚本的路径)
    """
    # 先清理资源
    print("清理资源目录 ./res/ ...")
    if RES_DIR.exists():
        shutil.rmtree(RES_DIR)
    RES_DIR.mkdir(parents=True, exist_ok=True)
    print("下载资源中 ...")
    # 使用python库下载域名和IP数据
    download("https://raw.githubusercontent.com/qxzg/Actions/3.0/fancyss_rules/chnlist.txt", RES_DIR / "chnlist.txt")
    download("https://raw.githubusercontent.com/felixonmars/dnsmasq-china-list/master/accelerated-domains.china.conf", RES_DIR / "accelerated-domains.china.conf")
    download("https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-cn.srs", RES_DIR / "geosite-cn.srs")
    download("https://raw.githubusercontent.com/SagerNet/sing-geoip/rule-set/geoip-cn.srs", RES_DIR / "geoip-cn.srs")
    download("https://raw.githubusercontent.com/gaoyifan/china-operator-ip/ip-lists/china.txt", RES_DIR / "china.txt")
    download("https://raw.githubusercontent.com/gaoyifan/china-operator-ip/ip-lists/china6.txt", RES_DIR / "china6.txt")
    # singbox decompile srs files
    print("解压缩 srs 文件 ...")
    decompile_srs(RES_DIR / "geosite-cn.srs", RES_DIR / "geosite-cn.json")
    decompile_srs(RES_DIR / "geoip-cn.srs", RES_DIR / "geoip-cn.json")
    # 读取域名数据并合并
    print("读取chnlist.txt ...")
    read_domain_to_set(RES_DIR / "chnlist.txt")
    print("读取accelerated-domains.china.conf ...")
    read_domain_to_set(RES_DIR / "accelerated-domains.china.conf")
    print("读取geosite-cn.json ...")
    read_domain_to_set(RES_DIR / "geosite-cn.json")
    print("完成域名数据读取, 准备写入 {} 个域名".format(len(DOMAIN_SET)))
    # 将域名集合写入 ../../res/chn-site.txt
    output_site_path = BASE_DIR / "../../res/chn-site.txt"
    with open(output_site_path, 'w', encoding='utf-8') as f:
        for domain in sorted(DOMAIN_SET):
            f.write(domain + "\n")
    print(f"已写入域名数据到 {output_site_path}")

    print("读取china.txt ...")
    read_ip_to_set(RES_DIR / "china.txt", IPV4_SET)
    print("读取geoip-cn.json v4 ...")
    read_ip_to_set(RES_DIR / "geoip-cn.json", IPV4_SET)
    print("读取china6.txt ...")
    read_ip_to_set(RES_DIR / "china6.txt", IPV6_SET)
    print("读取geoip-cn.json v6 ...")
    read_ip_to_set(RES_DIR / "geoip-cn.json", IPV6_SET)

    print("完成IP数据读取, 准备写入ip集合。")
    # 将IP集合写入 ../../res/chn-ip4.txt 和 ../../res/chn-ip6.txt
    output_ip4_path = BASE_DIR / "../../res/chn-ip4.txt"
    with open(output_ip4_path, 'w', encoding='utf-8') as f:
        ip4_cidr = IPV4_SET.iter_cidrs()
        for ip in ip4_cidr:
            f.write(str(ip) + "\n")
    print(f"已写入 IPv4 数据到 {output_ip4_path}")

    output_ip6_path = BASE_DIR / "../../res/chn-ip6.txt"
    with open(output_ip6_path, 'w', encoding='utf-8') as f:
        ip6_cidr = IPV6_SET.iter_cidrs()
        for ip in ip6_cidr:
            f.write(str(ip) + "\n")
    print(f"已写入 IPv6 数据到 {output_ip6_path}")

if __name__ == "__main__":
    main()
