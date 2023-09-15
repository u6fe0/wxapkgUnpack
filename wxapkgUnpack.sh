#!/bin/bash
# 清空 /data/data/com.tencent.mm/MicroMsg/{user_id}/appbrand/pkg 底下资源
# 其中{user_id}为类似 b080df3648b62ff828e1ef601ec5157d 字符串（进入到MicroMsg路径下输入ls命令查看）
user_id=4fb63e53f867e03819d7951c3762ef63
target_dir=/data/data/com.tencent.mm/MicroMsg/${user_id}/appbrand/pkg
# 询问是否清空缓存
# read -p "cache clear? (y/n)" result
# if [ $result == "y" ]; then
#     adb shell rm -rf ${target_dir}/*
#     echo "cleared !"
# fi
# 询问是否开始游戏
# read -p "please play the game" var
echo "copy start!"
today=$(date +%Y%m%d)
output_dir=/mnt/pkg${today}
adb shell rm -rf ${output_dir}
adb shell cp -r ${target_dir} ${output_dir}
adb pull ${output_dir}
echo "copy finish!"

# Unpack wxapkg
# 遍历当前目录下{output_dir}目录里面所有wxapkg文件
# 执行 node wuWxapkg.js xxx.wxapkg
current_dir=$(pwd)
sub_dir=pkg${today}
path=${current_dir}/${sub_dir}
for file in ${path}/*.wxapkg
do
    if [ -f "${file}" ]; then
        echo "Unpack ${file}"
        node tools/wxappUnpacker-master/wuWxapkg.js ${file}
    fi
done