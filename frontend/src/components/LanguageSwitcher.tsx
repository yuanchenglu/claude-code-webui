import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh-CN";

  const toggleLanguage = () => {
    const newLang = isZh ? "en" : "zh-CN";
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md text-sm font-medium text-slate-600 dark:text-slate-400"
      aria-label={isZh ? "Switch to English" : "切换到中文"}
      title={isZh ? "Switch to English" : "切换到中文"}
    >
      {isZh ? "EN" : "中"}
    </button>
  );
}