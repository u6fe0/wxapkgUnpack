#!/bin/bash
param1=$1;
user_name=chenhao
target_dir=/Users/${user_name}/Library/Containers/com.tencent.xinWeChat/Data/.wxapplet/packages
# 如果 param1 == latest，则获取最新的文件夹
if [ $param1 = "latest" ]; then
    # 获取最新的文件夹
    latest_dir=$(ls -t ${target_dir} | head -1)
    # 获取最新的文件夹的绝对路径
    target_dir=${target_dir}/${latest_dir}
else if [ $param1 = "clear" ]; then
    rm -rf ${target_dir}
    exit 0
else if [ $param1 = "open" ]; then
    open ${target_dir}
    exit 0
fi
fi
fi
timeStamp=$(date +%s)
cp -r ${target_dir} pkgs/${timeStamp}
# Unpack wxapkg
current_dir=$(pwd)
sub_dir=pkgs/${timeStamp}
path=${current_dir}/${sub_dir}
# 遍历当前目录下{path}目录、包含子目录下的wxapkg文件
# 执行 node wuWxapkg.js xxx.wxapkg
find ${path} -type f -name "*.wxapkg" -exec node tools/wxappUnpacker-master/wuWxapkg.js '{}' \;