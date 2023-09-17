# wxapkgUnpack

执行 sh install.sh 安装模块
最终解压至 pkgs 文件夹底下

## For Android

1. 安装 Mumu 模拟器
2. 在模拟器微信上打开小程序
3. 修改 sh androidUnpack.sh 的 user_hash
4. 执行 sh androidUnpack.sh

## For Mac

1. Mac 上打开微信小程序
2. 修改 macUnpack.sh 的 user_name
3. 执行 sh macUnpack.sh

## 问题汇总

1. adb shell error: no devices/emulators found
   解决方案，执行：
   adb kill-server
   adb start-server

2. unity bundle 解压 （未测试）
   https://github.com/mafaca/UtinyRipper
