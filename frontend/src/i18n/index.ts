import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

// 从 localStorage 获取保存的语言设置，默认为浏览器语言或英文
const savedLanguage = localStorage.getItem("language");
const browserLanguage = navigator.language.startsWith("zh") ? "zh-CN" : "en";
const defaultLanguage = savedLanguage || browserLanguage;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-CN": { translation: zhCN },
  },
  lng: defaultLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// 监听语言变化，保存到 localStorage
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("language", lng);
});

export default i18n;