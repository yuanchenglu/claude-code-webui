import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FolderIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { ProjectsResponse, ProjectInfo } from "../types";
import { getProjectsUrl } from "../config/api";
import { SettingsButton } from "./SettingsButton";
import { SettingsModal } from "./SettingsModal";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { OpenProjectModal } from "./OpenProjectModal";

export function ProjectSelector() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOpenProjectModalOpen, setIsOpenProjectModalOpen] = useState(false);
  const navigate = useNavigate();

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(getProjectsUrl());
      if (!response.ok) {
        throw new Error(`Failed to load projects: ${response.statusText}`);
      }
      const data: ProjectsResponse = await response.json();
      setProjects(data.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleProjectSelect = (projectPath: string) => {
    const normalizedPath = projectPath.startsWith("/")
      ? projectPath
      : `/${projectPath}`;
    navigate(`/projects${normalizedPath}`);
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const handleOpenProjectSelect = (projectPath: string) => {
    const normalizedPath = projectPath.startsWith("/")
      ? projectPath
      : `/${projectPath}`;
    navigate(`/projects${normalizedPath}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600 dark:text-slate-400">
          {t("chat.loading")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-slate-800 dark:text-slate-100 text-3xl font-bold tracking-tight">
            {t("projects.title")}
          </h1>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <SettingsButton onClick={handleSettingsClick} />
          </div>
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={() => setIsOpenProjectModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
          >
            <PlusIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              {t("projects.openNew")}
            </span>
          </button>
        </div>

        <div className="space-y-3">
          {projects.length > 0 && (
            <>
              <h2 className="text-slate-700 dark:text-slate-300 text-lg font-medium mb-4">
                {t("projects.recentProjects")}
              </h2>
              {projects.map((project) => (
                <button
                  type="button"
                  key={project.path}
                  onClick={() => handleProjectSelect(project.path)}
                  className="w-full flex items-center gap-3 p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-left"
                >
                  <FolderIcon className="h-5 w-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                  <span className="text-slate-800 dark:text-slate-200 font-mono text-sm">
                    {project.path}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>

        <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} />

        <OpenProjectModal
          isOpen={isOpenProjectModalOpen}
          onClose={() => setIsOpenProjectModalOpen(false)}
          onProjectSelect={handleOpenProjectSelect}
        />
      </div>
    </div>
  );
}
