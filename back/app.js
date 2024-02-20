const express = require("express");
const cors = require("cors");
const multiparty = require("multiparty");
const bodyParser = require("body-parser");
const json = express.json({ type: "*/json" });
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "./assets")));
app.use(json);
app.use(bodyParser.urlencoded({ extended: false }));
const port = 3000;

// 上传
app.post("/upload", (req, res, next) => {
  const form = new multiparty.Form();
  form.parse(req, (err, fields, files) => {
    console.log(fields, files);
    if (err) {
      next(err);
      return;
    }
    let pa = path.join(
      __dirname,
      "./public/upload/chunk/" + fields["filename"][0]
    );
    let filePa = path.join(
      __dirname,
      "./assets/",
      `${fields.filename}.${fields.extname}`
    );
    // 判断是否是断点续传
    if (fs.existsSync(pa) && parseInt(fields.index[0]) === 0) {
      // 存在该目录
      // 返回最大的索引
      let maxIndex = 0;
      let arr = fs.readdirSync(pa);
      /**
       * 如果前端传递的文件名称为 index + @ + name 的话
       * 就不需要这种方式进行过滤出最后一次上传时的index了
       */
      // for (let i = 0; i < arr.length; i++) {
      //   let str = parseInt(arr[i].split("@")[0]);
      //   if (str > maxIndex) {
      //     maxIndex = str;
      //   }
      // }
      res.send({
        code: 300,
        msg: "存在该目录，请继续上传",
        index: arr.at(-1).split("@")[0],
      });
    }
    // 判断文件是否已经存在
    else if (fs.existsSync(filePa)) {
      res.send({
        code: 201,
        data: "/" + fields.filename + "." + fields.extname,
      });
    } else {
      // 将每一次上传的数据进行统一的存储
      const oldName = files.chunk[0].path;

      const newName = path.join(
        __dirname,
        "./public/upload/chunk/" +
          fields["filename"][0] +
          "/" +
          fields["name"][0]
      );

      // 创建临时存储目录
      fs.mkdirSync("./public/upload/chunk/" + fields["filename"][0], {
        recursive: true,
      });
      fs.copyFile(oldName, newName, (err) => {
        if (err) {
          console.error(err);
        } else {
          fs.unlink(oldName, (err) => {
            if (err) {
              console.error(err);
            } else {
              console.log("文件复制和删除成功");
            }
          });
        }
      });
      res.send({
        code: 200,
        msg: "分片上传成功",
        index: parseInt(fields["index"][0]),
      });
    }
  });
});
// 合并请求
app.post("/mergeFile", (req, res, next) => {
  const fields = req.body;
  thunkStreamMerge(
    path.join(__dirname, "./public/upload/chunk/", fields.filename),
    path.join(__dirname, "./assets/", fields.filename + "." + fields.extname)
  );
  res.send({
    code: 200,
    data: "/" + fields.filename + "." + fields.extname,
  });
});

const thunkStreamMerge = (sourceFiles, targetFile) => {
  const list = fs.readdirSync(sourceFiles);
  console.log(list);
  const chunkFilePathList = list.map((name) => ({
    name,
    filePath: path.resolve(sourceFiles, name),
  }));
  const fileWriteStream = fs.createWriteStream(targetFile);
  thunkStreamMergeProgress(chunkFilePathList, fileWriteStream, sourceFiles);
};

const thunkStreamMergeProgress = (fileList, fileWriteStream, sourceFiles) => {
  if (!fileList.length) {
    fileWriteStream.end("完成了");
    if (sourceFiles)
      fs.rm(sourceFiles, { recursive: true, force: true }, (error) => {
        console.error(error);
      });
    return;
  }
  const data = fileList.shift();
  const { filePath: chunkFilePath } = data;

  const currentReadStream = fs.createReadStream(chunkFilePath);

  currentReadStream.pipe(fileWriteStream, { end: false });
  currentReadStream.on("end", () => {
    thunkStreamMergeProgress(fileList, fileWriteStream, sourceFiles);
  });
};

app.listen(port, () => {
  console.log("启动成功" + port);
});
