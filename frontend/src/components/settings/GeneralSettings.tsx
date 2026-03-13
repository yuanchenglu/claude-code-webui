import {
  SunIcon,
  MoonIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";

export function GeneralSettings() {
  const { t } = useTranslation();
  const { theme, enterBehavior, toggleTheme, toggleEnterBehavior } =
    useSettings();

  const isLight = theme === "light";
  const isSend = enterBehavior === "send";

  return (
    <div className="space-y-6">
      {/* Live region for screen reader announcements */}
      <div aria-live="polite" className="sr-only" id="settings-announcements">
        {isLight ? t("settings.light") : t("settings.dark")}.{" "}
        {isSend
          ? t("settings.enterToSend")
          : t("settings.enterForNewLine")}
        .
      </div>

      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">
          {t("settings.title")}
        </h3>

        {/* Theme Setting */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              {t("settings.theme")}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-left flex-1"
                role="switch"
                aria-checked={!isLight}
                aria-label={`Theme toggle. Currently set to ${theme} mode. Click to switch to ${isLight ? "dark" : "light"} mode.`}
              >
                {isLight ? (
                  <SunIcon className="w-5 h-5 text-yellow-500" />
                ) : (
                  <MoonIcon className="w-5 h-5 text-blue-400" />
                )}
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {isLight ? t("settings.light") : t("settings.dark")}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Enter Behavior Setting */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              {t("settings.enterKeyBehavior")}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleEnterBehavior}
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-left flex-1"
                role="switch"
                aria-checked={isSend}
                aria-label={`Enter key behavior toggle. Currently set to ${isSend ? "send message" : "newline"}. Click to switch behavior.`}
              >
                <CommandLineIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {isSend
                      ? t("settings.enterToSend")
                      : t("settings.enterForNewLine")}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
