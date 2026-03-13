import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh-CN' ? 'en' : 'zh-CN';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md text-xs font-medium text-slate-600 dark:text-slate-400"
      aria-label={i18n.language === 'zh-CN' ? 'Switch to English' : '切换到中文'}
    >
      {i18n.language === 'zh-CN' ? 'EN' : '中文'}
    </button>
  );
}