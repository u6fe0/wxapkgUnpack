// 还原 spine data
// spine 动画文件由三个部分组成，分别是：xxx.atlas.txt、xxx.json、xxx.png
// 经过 creator 编译后，config.json 的 paths 中会存在 xxx.atlas、xxx、xxx/texture、xxx/spriteFrame、xxx
const { log, warn, error } = require("console");
const decodeUuid = require("./utils/decode-uuid");
const fs = require("fs");
const path = require("path");
const { exit } = require("process");
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

if (!configFile.endsWith(".json")) {
  error("配置文件格式不正确");
  exit();
}
const configFileDir = path.dirname(configFile);
const configContent = fs.readFileSync(configFile);
const config = JSON.parse(configContent);
// 遍历uuids
const urls = [];
const skeletonDataUrls = {};
const types = config.types;
let importBase = [];
let nativeBase = [];
if (config.versions) {
  importBase = config.versions.import;
  nativeBase = config.versions.native;
}
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
          parentDir + "/" + libUrlNoExt + "." + version + postfix;
        // log("native finalPath", uuid, finalPath);
        urls.push(finalPath);
        if (type == "sp.SkeletonData") {
          if (!skeletonDataUrls[uuid]) {
            skeletonDataUrls[uuid] = {};
          }
          skeletonDataUrls[uuid]["native"] = finalPath;
        }
      } else if (nativeBase.length == 0) {
        const finalPath = parentDir + "/" + libUrlNoExt + postfix;
        // log("native finalPath", uuid, finalPath);
        urls.push(finalPath);
        if (type == "sp.SkeletonData") {
          if (!skeletonDataUrls[uuid]) {
            skeletonDataUrls[uuid] = {};
          }
          skeletonDataUrls[uuid]["native"] = finalPath;
        }
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
          parentDir + "/" + libUrlNoExt + "." + version + postfix;
        // log("import finalPath", uuid, finalPath);
        urls.push(finalPath);
        if (type == "sp.SkeletonData") {
          if (!skeletonDataUrls[uuid]) {
            skeletonDataUrls[uuid] = {};
          }
          skeletonDataUrls[uuid]["import"] = finalPath;
        }
      } else if (importBase.length == 0) {
        const finalPath = parentDir + "/" + libUrlNoExt + postfix;
        // log("import finalPath", uuid, finalPath);
        urls.push(finalPath);
        if (type == "sp.SkeletonData") {
          if (!skeletonDataUrls[uuid]) {
            skeletonDataUrls[uuid] = {};
          }
          skeletonDataUrls[uuid]["import"] = finalPath;
        }
      } else {
        // warn("[import miss]:", uuid, libUrlNoExt, i);
      }
    }
  } else {
    // warn("path", uuid, "不存在");
  }
}
let keyCount = Object.keys(skeletonDataUrls).length;
let parseCnt = 0;
for (const key in skeletonDataUrls) {
  process.stdout.write("解析中:" + ++parseCnt + "/" + keyCount + "\r");
  if (Object.hasOwnProperty.call(skeletonDataUrls, key)) {
    const skeletonDataUrl = skeletonDataUrls[key];
    const importUrl = skeletonDataUrl["import"];
    const nativeUrl = skeletonDataUrl["native"];
    const url = importUrl;
    const realUrl = path.join(configFileDir, url);
    if (!fs.existsSync(realUrl)) {
      continue;
    }
    const skeletonDataStr = fs.readFileSync(realUrl);
    const skeletonData = JSON.parse(skeletonDataStr);
    // xxx.atlas.txt
    let atlasTxt = skeletonData[5][0][3];
    if (!atlasTxt) {
      continue;
    }
    // 如果 atlasTxt 是数组
    if (Array.isArray(atlasTxt)) {
      atlasTxt = atlasTxt[0];
    }
    const spineName = skeletonData[5][0][1];
    if (!spineName) {
      continue;
    }
    const atlasTxtUrl = path.join(
      configFileDir,
      "spine",
      spineName,
      spineName + ".atlas.txt"
    );
    // console.log("atlasTxtUrl:", atlasTxtUrl);
    // 写文件
    ensureDirectoryExistence(atlasTxtUrl);
    try {
      fs.writeFileSync(atlasTxtUrl, atlasTxt, "utf-8");
    } catch (error) {
      console.log("atlasTxt:", atlasTxt);
    }
    // xxx.png
    const textureId = skeletonData[1][0];
    if (!textureId) {
      continue;
    }
    const urls = getTexturePath(config, textureId);
    const urlWithPng = urls[0];
    if (!urlWithPng) {
      continue;
    }
    const realUrlWithPng = path.join(configFileDir, urlWithPng);
    if (!fs.existsSync(realUrlWithPng)) {
      continue;
    }
    const textureName = skeletonData[5][0][4][0];
    if (!textureName) {
      continue;
    }
    const textureTargetPath = path.join(
      configFileDir,
      "spine",
      spineName,
      textureName
    );
    // 拷贝
    fs.copyFileSync(realUrlWithPng, textureTargetPath);
    // xxx.bin
    const realUrlWithBin = path.join(configFileDir, nativeUrl);
    if (!fs.existsSync(realUrlWithBin)) {
      continue;
    }
    const binTargetPath = path.join(
      configFileDir,
      "spine",
      spineName,
      spineName + ".skel"
    );
    // 拷贝
    fs.copyFileSync(realUrlWithBin, binTargetPath);
  }
}
console.log("解析完成", parseCnt + "/" + keyCount);
function getTexturePath(config, uuid) {
  const separator = "@";
  const strs = uuid.split(separator);
  uuid = strs[0];
  const i = config.uuids.indexOf(uuid);
  const urls = [];
  const path = config.paths[i];
  var uuid_de = decodeUuid(uuid);
  const libUrlNoExt = uuid_de.slice(0, 2) + "/" + uuid_de;
  if (path) {
    const fileName = path[0];
    const typeIndex = path[1];
    const type = types[typeIndex];
    if (filterTypes.indexOf(type) == -1) {
      return;
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
          parentDir + "/" + libUrlNoExt + "." + version + postfix;
        // log("native finalPath", uuid, finalPath);
        urls.push(finalPath);
      } else if (nativeBase.length == 0) {
        const finalPath = parentDir + "/" + libUrlNoExt + postfix;
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
          parentDir + "/" + libUrlNoExt + "." + version + postfix;
        urls.push(finalPath);
      } else if (importBase.length == 0) {
        const finalPath = parentDir + "/" + libUrlNoExt + postfix;
        urls.push(finalPath);
      } else {
        // warn("[import miss]:", uuid, libUrlNoExt, i);
      }
    }
  } else {
    // warn("path", uuid, "不存在");
  }
  return urls;
}
function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}
