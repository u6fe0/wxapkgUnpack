const https = require("https");
const fileUrl =
  "https://sskill.weimigames.com/wuxiaProject/remote/arena/config.cb84a.json";

// 读取远程资源配置文件
https
  .get(fileUrl, (res) => {
    let data = "";
    // A chunk of data has been received.
    res.on("data", (chunk) => {
      data += chunk;
    });

    // The whole response has been received.
    res.on("end", () => {
      console.log(data);
    });
  })
  .on("error", (err) => {
    console.log("Error: " + err.message);
  });
