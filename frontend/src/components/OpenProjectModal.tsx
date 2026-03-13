import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon, FolderIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { getApiBaseUrl } from "../config/api";

interface DirectoryEntry {
  path: string;
  name: string;
  isDirectory: boolean;
}

interface OpenProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSelect: (path: string) => void;
}

interface SearchResults {
  recent: DirectoryEntry[];
  directories: DirectoryEntry[];
}

export function OpenProjectModal({ isOpen, onClose, onProjectSelect }: OpenProjectModalProps) {
  const { t } = useTranslation();
  const [searchPath, setSearchPath] = useState("");
  const [results, setResults] = useState<SearchResults>({ recent: [], directories: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const searchDirectories = useCallback(async (path: string) => {
    if (!path.trim()) {
      setResults({ recent: [], directories: [] });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/projects/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchPath: path }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults({
          recent: [],
          directories: data.directories || [],
        });
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    (path: string) => {
      const timer = setTimeout(() => searchDirectories(path), 300);
      return () => clearTimeout(timer);
    },
    [searchDirectories],
  );

  useEffect(() => {
    if (!isOpen) {
      setSearchPath("");
      setResults({ recent: [], directories: [] });
      setSelectedIndex(-1);
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = debouncedSearch(searchPath);
    return timer;
  }, [searchPath, debouncedSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allItems = [...results.recent, ...results.directories];

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0 && selectedIndex < allItems.length) {
      e.preventDefault();
      handleSelect(allItems[selectedIndex].path);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (path: string) => {
    onProjectSelect(path);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const hasResults = results.recent.length > 0 || results.directories.length > 0;

  return (
    <button
      type="button"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 w-full"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-2xl mt-12 sm:mt-16 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          handleKeyDown(e);
        }}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2
            id="modal-title"
            className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-100"
          >
            {t("projects.openProject.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            onKeyDown={handleKeyDown}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-4 sm:p-5 pb-3 flex-shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchPath}
              onChange={(e) => setSearchPath(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                handleKeyDown(e);
              }}
              placeholder={t("projects.openProject.searchPlaceholder")}
              className="w-full pl-10 pr-10 py-3 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {searchPath && (
              <button
                type="button"
                onClick={() => setSearchPath("")}
                onKeyDown={handleKeyDown}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                aria-label="Clear search"
              >
                <XMarkIcon className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        <div
          ref={resultsRef}
          className="overflow-y-auto px-4 sm:px-5 pb-4 flex-grow"
        >
          {loading && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              {t("projects.openProject.searching")}
            </div>
          )}

          {!loading && !hasResults && searchPath.trim() && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              {t("projects.openProject.noResults")}
            </div>
          )}

          {!loading && !hasResults && !searchPath.trim() && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              {t("projects.openProject.typeToSearch")}
            </div>
          )}

          {hasResults && (
            <div className="space-y-1">
              {results.recent.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t("projects.openProject.recentProjects")}
                  </h3>
                  {results.recent.map((item, index) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleSelect(item.path)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onKeyDown={handleKeyDown}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                        selectedIndex === index
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <FolderIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-200 font-mono truncate">
                        {item.path}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results.directories.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t("projects.openProject.openProject")}
                  </h3>
                  {results.directories.map((item, index) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleSelect(item.path)}
                      onMouseEnter={() => setSelectedIndex(results.recent.length + index)}
                      onKeyDown={handleKeyDown}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                        selectedIndex === results.recent.length + index
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <FolderIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-200 font-mono truncate">
                        {item.path}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            {t("projects.openProject.keyboardHint")}
          </p>
        </div>
      </div>
    </button>
  );
}
