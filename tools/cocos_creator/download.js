const decodeUuid = require("./utils/decode-uuid");
const fs = require("fs");
const https = require("https");
const path = require("path");
const { exit } = require("process");
// 请先配置远程地址
const CDN_URL = "xxx";
if(CDN_URL == "xxx") {
  console.log("请先配置CDN地址");
  exit();
}
// 配置文件 config.json 位置
if (process.argv.length < 3) {
  console.log("请传入配置文件路径");
  exit();
}

const configPath = process.argv[2];
// 过滤的文件类型
const filterTypes = [
  "cc.Texture2D",
  "cc.Asset",
  "cc.BufferAsset",
  "cc.SpriteFrame",
  "cc.TextAsset",
  "cc.TTFFont",
  "sp.SkeletonData",
  "cc.EffectAsset",
  "cc.Material",
  "cc.Prefab",
  "cc.AudioClip",
];
const nativeTypes = ["cc.AudioClip", "cc.Texture2D", "cc.TTFFont"];
const importTypes = [
  "cc.Asset",
  "cc.BufferAsset",
  "cc.SpriteFrame",
  "cc.TextAsset",
  "cc.TTFFont",
  "sp.SkeletonData",
  "cc.EffectAsset",
  "cc.Material",
  "cc.Prefab",
  "cc.AudioClip",
];
fs.readFile(configPath, "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  const config = JSON.parse(data);
  const importBase = config.versions.import;
  const nativeBase = config.versions.native;
  const types = config.types;
  const bundleName = config.name;
  // 所有的地址
  const urls = [];
  // 遍历packs
  for (var key in config.packs) {
    if (config.packs.hasOwnProperty(key)) {
      // pack 是一个数组
      const pack = config.packs[key];
      const importIndex = importBase.findIndex((item) => {
        return item == key;
      });
      const nextIndex = importIndex + 1;
      if (importIndex > -1 && importBase[nextIndex]) {
        const parentDir = "import";
        const version = importBase[nextIndex];
        const libUrlNoExt = key.slice(0, 2) + "/" + key;
        const finalPath =
          bundleName +
          "/" +
          parentDir +
          "/" +
          libUrlNoExt +
          "." +
          version +
          ".json";
        urls.push(finalPath);
      }
    }
  }
  // 遍历uuids
  for (let i = 0; i < config.uuids.length; i++) {
    const uuid = config.uuids[i];
    const path = config.paths[i];
    var uuid_de = decodeUuid(uuid);
    const libUrlNoExt = uuid_de.slice(0, 2) + "/" + uuid_de;
    if (path) {
      const fileName = path[0];
      const typeIndex = path[1];
      const type = types[typeIndex];
      if (filterTypes.indexOf(type) == -1) {
        continue;
      }
      if (nativeTypes.indexOf(type) > -1) {
        const parentDir = "native";
        let postfix = "";
        switch (type) {
          case "cc.AudioClip":
            // TODO:再判断是否是其他音频格式
            postfix = ".mp3";
            break;
          case "cc.Texture2D":
            // TODO:再判断是否是其他图片格式
            postfix = ".png";
            break;
          case "cc.TTFFont":
            postfix = "/" + fileName + ".ttf";
            break;
        }
        const nativeIndex = nativeBase.findIndex((item) => {
          return item == i;
        });
        const nextIndex = nativeIndex + 1;
        if (nativeIndex > -1 && nativeBase[nextIndex]) {
          const version = nativeBase[nextIndex];
          const finalPath =
            bundleName +
            "/" +
            parentDir +
            "/" +
            libUrlNoExt +
            "." +
            version +
            postfix;
          // console.log("native finalPath", uuid, finalPath);
          urls.push(finalPath);
        } else {
          console.warn("[native miss]:", uuid, libUrlNoExt, i);
        }
      }
      if (importTypes.indexOf(type) > -1) {
        const parentDir = "import";
        const postfix = ".json";
        const importIndex = importBase.findIndex((item) => {
          return item == i;
        });
        const nextIndex = importIndex + 1;
        if (importIndex > -1 && importBase[nextIndex]) {
          const version = importBase[nextIndex];
          const finalPath =
            bundleName +
            "/" +
            parentDir +
            "/" +
            libUrlNoExt +
            "." +
            version +
            postfix;
          // console.log("import finalPath", uuid, finalPath);
          urls.push(finalPath);
        } else {
          console.warn("[import miss]:", uuid, libUrlNoExt, i);
        }
      }
    } else {
      // console.warn("path", uuid, "不存在");
    }
  }
  // 已经下载的文件数
  const totalCount = urls.length;
  let downloadedCnt = 0;
  downloadFiles(
    urls,
    () => {
      downloadedCnt++;
      process.stdout.write(
        "downloading:" + downloadedCnt + "/" + totalCount + "\r"
      );
    },
    () => {
      console.log("下载完成！！");
      exit();
    }
  );
});

// 最大并发数
const MaxMulti = 200;
// 当前下载数
let currentDownLoadCnt = 0;

/**
 * 批量下载文件
 */
function downloadFiles(urls, progressCb, finishCb) {
  if (urls.length > 0) {
    while (currentDownLoadCnt < MaxMulti) {
      currentDownLoadCnt++;
      const url = urls.shift();
      const realUrl = CDN_URL + url;
      const dest = __dirname + "/" + url;
      ensureDirectoryExistence(dest);
      download(realUrl, dest, () => {
        currentDownLoadCnt--;
        progressCb && progressCb(dest);
        downloadFiles(urls, progressCb, finishCb);
      });
    }
  } else {
    if (currentDownLoadCnt == 0) {
      finishCb && finishCb();
    }
  }
}
/**
 * 确保文件夹存在
 * @param {*} filePath
 * @returns
 */
function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}
/**
 * 下载文件
 * @param {*} url
 * @param {*} dest
 * @param {*} cb
 */
function download(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  https
    .get(url, function (response) {
      response.pipe(file);
      file.on("finish", function () {
        file.close(cb); // close() is async, call cb after close completes.
      });
    })
    .on("error", function (downloadErr) {
      console.log("download err", url, downloadErr);
      // Handle errors
      fs.unlink(dest, (unlinkErr) => {
        if (unlinkErr) {
          console.log("unlink err", unlinkErr);
        }
        cb && cb();
      }); // Delete the file async. (But we don't check the result)
    });
}
