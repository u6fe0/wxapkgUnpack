# wxapkgUnpack

1. 执行 sh install.sh 安装模块
2. 安装 Mumu 模拟器
3. 在模拟器上的微信上打开小程序
4. 执行 sh wxapkgUnpack.sh 解压

## 问题汇总

1. adb shell error: no devices/emulators found
   解决方案，执行：
   adb kill-server
   adb start-server
