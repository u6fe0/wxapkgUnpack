#!/bin/bash
# 清空 /data/data/com.tencent.mm/MicroMsg/{user哈希值}/appbrand/pkg 底下资源
user_hash=4fb63e53f867e03819d7951c3762ef63
target_dir=/data/data/com.tencent.mm/MicroMsg/${user_hash}/appbrand/pkg
# 询问是否清空缓存
# read -p "cache clear? (y/n)" result
# if [ $result == "y" ]; then
#     adb shell rm -rf ${target_dir}/*
#     echo "cleared !"
# fi
# 询问是否开始游戏
# read -p "please play the game" var
echo "copy start!"
timeStamp=$(date +%s)
output_dir=/mnt/${timeStamp}
adb shell rm -rf ${output_dir}
adb shell cp -r ${target_dir} ${output_dir}
rm -rf pkgs/${timeStamp}
adb pull ${output_dir} pkgs/${timeStamp}
echo "copy finish!"

# Unpack wxapkg
# 遍历当前目录下{output_dir}目录里面所有wxapkg文件
# 执行 node wuWxapkg.js xxx.wxapkg
current_dir=$(pwd)
sub_dir=pkgs/${timeStamp}
path=${current_dir}/${sub_dir}
for file in ${path}/*.wxapkg
do
    if [ -f "${file}" ]; then
        echo "Unpack ${file}"
        node tools/wxappUnpacker-master/wuWxapkg.js ${file}
    fi
done