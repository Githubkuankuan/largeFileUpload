<script setup>
import { ref } from "vue";
import axios from "axios";
import SparkMD5 from "spark-md5";
const chunkSize = 1024 * 1024; // 每一个chunk的大小，这里是 1MB

// 存放切片文件
const fileList = ref([]);
const fileMd5 = ref("");
const file = ref();
let ii = 0;
let percentage = ref(0);
let parsePercentage = ref(0);

// 可以拿到文件对象，将文件存储起来
const fileChange = (e) => {
  file.value = e.target.files[0];
  percentage.value = 0;
};

// 点击开始上传按钮，将文件进行切片处理、解析文件（生成hash）、开始上传
const uploadBtn = () => {
  loading.value = true;
  let _fileList = [];
  // 切片
  for (let i = 0; i < file.value.size; i += chunkSize) {
    _fileList.push(file.value.slice(i, i + chunkSize));
  }
  fileList.value = _fileList;
  const hash = new SparkMD5.ArrayBuffer();
  const fileReader = new FileReader();
  fileReader.onload = (e) => {
    hash.append(e.target.result);
    ii++;
    if (ii < fileList.value.length) {
      readerChunk();
    } else {
      ii = 0;
      fileMd5.value = hash.end();
      loading.value = false;
      upload(0);
    }
  };
  function readerChunk() {
    // 解析的进度
    parsePercentage.value = (((ii + 1) / fileList.value.length) * 100).toFixed(
      2
    );
    fileReader.readAsArrayBuffer(fileList.value[ii]);
  }
  readerChunk();
};

const upload = async (index) => {
  if (index === fileList.value.length) {
    mergeUpload();
    return;
  }
  const formData = new FormData();
  formData.append("chunk", fileList.value[index]);
  formData.append("index", index);
  /**
   * 这里的名字特别约定一下
   * 为什么不使用 fileMd5.value + "@" + index？
   *   如果是断点续传的时候，需要拿到最后一次上传的index。
   *   上边这种方式还需要进行排序，这种的话直接取到最后一个就可以了
   */
  formData.append("name", index + "@" + fileMd5.value);
  formData.append("filename", fileMd5.value);
  formData.append("extname", "png");
  let { data } = await axios.post("http://localhost:3000/upload", formData, {
    header: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (data.code === 300) {
    // 证明已经存在部分文件
    percentage.value = ((data.index / fileList.value.length) * 100).toFixed(2);
    upload(data.index + 1);
  } else if (data.code === 200) {
    percentage.value = (((index + 1) / fileList.value.length) * 100).toFixed(2);
    upload(data.index + 1);
  } else if (data.code === 201) {
    percentage.value = 100;
    console.log(
      "%c [  ]-60",
      "font-size:13px; background:pink; color:#bf2c9f;",
      data
    );
  } else {
    upload(index);
  }
};

// 合并请求
const mergeUpload = async () => {
  let { data } = await axios.post("http://localhost:3000/mergeFile", {
    filename: fileMd5.value,
    extname: "png",
  });
};
const loading = ref(false);
</script>

<template>
  <div>
    <input type="file" @change="fileChange" />
    <button @click="uploadBtn">{{ loading ? "正在解析" : "开始上传" }}</button>
    解析进度
    <input type="range" name="" id="" :value="parsePercentage" />
    {{ parsePercentage }}%
    <br />
    上传进度
    <input type="range" name="" id="" :value="percentage" />
    {{ percentage }}%
    <br />
    <input type="text" />
  </div>
</template>

<style scoped></style>
