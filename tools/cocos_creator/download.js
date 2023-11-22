const { log, warn, error } = require("console");
const decodeUuid = require("./utils/decode-uuid");
const fs = require("fs");
const https = require("https");
const path = require("path");
const { exit } = require("process");
const axios = require("axios");
const fsPromises = require("fs").promises;
// 最大并发数
const maxConcurrency = 20;
let curConcurrency = 0;
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
  "cc.JsonAsset",
  "cc.ImageAsset",
];
const nativeTypes = [
  "cc.AudioClip",
  "cc.TTFFont",
  "cc.ImageAsset",
  "sp.SkeletonData",
];
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
  "cc.Texture2D",
  "cc.ImageAsset",
];

// 获取传入的参数
const args = process.argv.splice(2);
if (args.length == 0) {
  error("请输入参数");
  exit();
}
// 读取配置文件
const configFile = args[0];
if (!fs.existsSync(configFile)) {
  error("配置文件不存在");
  exit();
}
const configUrls = [];
let CDN_URL = "";
// 如果是js文件
if (configFile.endsWith(".js")) {
  // nodejs window is not defined
  global.window = {};
  try {
    require(configFile);
  } catch (error) {
    error(error);
    exit();
  }
  // 远程资源地址
  CDN_URL = window._CCSettings.server.replace(/\/$/, "") + "/remote/";
  log("CDN_URL", CDN_URL);
  // 配置文件
  for (let i = 0; i < window._CCSettings.remoteBundles.length; i++) {
    const bundleName = window._CCSettings.remoteBundles[i];
    const bundleVer = window._CCSettings.bundleVers[bundleName];
    const configUrl = CDN_URL + bundleName + "/config." + bundleVer + ".json";
    configUrls.push(configUrl);
  }
} else if (configFile.endsWith(".json")) {
  const configContent = fs.readFileSync(configFile);
  const config = JSON.parse(configContent);
  // 远程资源地址
  CDN_URL = config.assets.server.replace(/\/$/, "") + "/remote/";
  log("CDN_URL", CDN_URL);
  // 配置文件
  for (let i = 0; i < config.assets.remoteBundles.length; i++) {
    const bundleName = config.assets.remoteBundles[i];
    const bundleVer = config.assets.bundleVers[bundleName];
    const configUrl = CDN_URL + bundleName + "/config." + bundleVer + ".json";
    configUrls.push(configUrl);
  }
} else {
  error("配置文件格式不正确");
  exit();
}
// 开始解析
parse(configUrls);
async function parse(configUrls) {
  // 获取configUrls， 缓存所有的config 内容
  log("configUrls.length", configUrls.length);
  for (let i = 0; i < configUrls.length; i++) {
    log("configUrls", configUrls[i]);
    const configUrl = configUrls[i];
    const configContent = await getConfigContent(configUrl);
    const config = JSON.parse(configContent);
    // configUrl  去除 CDN_URL
    const configUrlNoCDN = configUrl.replace(CDN_URL, "");
    // 所有的地址
    const urls = [configUrlNoCDN];
    const types = config.types;
    const name = config.name;
    const packs = config.packs;
    const isZip = config.isZip;
    if (isZip) {
      const zipVersion = config.zipVersion;
      const finalPath = name + "/res." + zipVersion + ".zip";
      urls.push(finalPath);
    } else {
      let importBase = [];
      let nativeBase = [];
      if (config.versions) {
        importBase = config.versions.import;
        nativeBase = config.versions.native;
      }
      // 遍历packs
      for (var key in packs) {
        if (packs.hasOwnProperty(key)) {
          // pack 是一个数组
          const pack = packs[key];
          const importIndex = importBase.findIndex((item) => {
            return item == key;
          });
          const nextIndex = importIndex + 1;
          if (importIndex > -1 && importBase[nextIndex]) {
            const parentDir = "import";
            const version = importBase[nextIndex];
            const libUrlNoExt = key.slice(0, 2) + "/" + key;
            const finalPath =
              name +
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
              case "cc.ImageAsset":
                // TODO:再判断是否是其他图片格式
                postfix = ".png";
                break;
              case "cc.TTFFont":
                postfix = "/" + fileName + ".ttf";
                break;
              case "sp.SkeletonData":
                postfix = ".bin";
                break;
            }
            const nativeIndex = nativeBase.findIndex((item) => {
              return item == i;
            });
            const nextIndex = nativeIndex + 1;
            if (nativeIndex > -1 && nativeBase[nextIndex]) {
              const version = nativeBase[nextIndex];
              const finalPath =
                name +
                "/" +
                parentDir +
                "/" +
                libUrlNoExt +
                "." +
                version +
                postfix;
              // log("native finalPath", uuid, finalPath);
              urls.push(finalPath);
            } else if (nativeBase.length == 0) {
              const finalPath =
                name + "/" + parentDir + "/" + libUrlNoExt + postfix;
              // log("native finalPath", uuid, finalPath);
              urls.push(finalPath);
            } else {
              // warn("[native miss]:", uuid, libUrlNoExt, i);
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
                name +
                "/" +
                parentDir +
                "/" +
                libUrlNoExt +
                "." +
                version +
                postfix;
              // log("import finalPath", uuid, finalPath);
              urls.push(finalPath);
            } else if (importBase.length == 0) {
              const finalPath =
                name + "/" + parentDir + "/" + libUrlNoExt + postfix;
              // log("import finalPath", uuid, finalPath);
              urls.push(finalPath);
            } else {
              // warn("[import miss]:", uuid, libUrlNoExt, i);
            }
          }
        } else {
          // warn("path", uuid, "不存在");
        }
      }
    }
    await downloadFilesConcurrent(urls);
  }
}
// 并发下载
async function downloadFilesConcurrent(urls) {
  const totalCount = urls.length;
  let downloadedCnt = 0;
  process.stdout.write(
    "downloading:" + downloadedCnt + "/" + totalCount + "\r"
  );
  const promises = urls.map(async (url, index) => {
    while (curConcurrency > maxConcurrency) {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve();
        }, 100);
      });
    }
    curConcurrency++;
    const realUrl = CDN_URL + url;
    const domain = CDN_URL.split("/")[2];
    const dest = __dirname + "/outputs/" + domain + "/" + url;
    ensureDirectoryExistence(dest);
    try {
      const response = await axios.get(realUrl, {
        responseType: "arraybuffer",
        timeout: 15000, // 超时时间为15秒
        maxContentLength: Infinity,
      });
      await fsPromises.writeFile(dest, response.data);
    } catch (err) {
      error(`realUrl:${realUrl}, err.message:${err.message}`);
    }
    downloadedCnt++;
    curConcurrency--;
    process.stdout.write(
      "downloading:" + downloadedCnt + "/" + totalCount + "\r"
    );
  });

  await Promise.all(promises);
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

async function getConfigContent(configUrl) {
  return new Promise((resolve, reject) => {
    https
      .get(configUrl, (res) => {
        let data = "";
        // A chunk of data has been received.
        res.on("data", (chunk) => {
          data += chunk;
        });
        // The whole response has been received.
        res.on("end", () => {
          resolve(data);
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}
