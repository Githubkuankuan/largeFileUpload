import { createApp } from "vue";
// import './style.css'
// import App from "./App阻塞页面.vue";
import App from "./App不阻塞页面.vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

createApp(App).use(ElementPlus).mount("#app");
