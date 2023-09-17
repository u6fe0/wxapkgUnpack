#!/bin/bash
user_name=chenhao
target_dir=/Users/${user_name}/Library/Containers/com.tencent.xinWeChat/Data/.wxapplet/packages
# 清空目标目录
# rm -rf ${target_dir}/*
timeStamp=$(date +%s)
cp -r ${target_dir} pkgs/${timeStamp}
# Unpack wxapkg
current_dir=$(pwd)
sub_dir=pkgs/${timeStamp}
path=${current_dir}/${sub_dir}
# 遍历当前目录下{path}目录、包含子目录下的wxapkg文件
# 执行 node wuWxapkg.js xxx.wxapkg
find ${path} -type f -name "*.wxapkg" -exec node tools/wxappUnpacker-master/wuWxapkg.js '{}' \;