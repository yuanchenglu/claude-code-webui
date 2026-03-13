import { Context } from "hono";
import type { ProjectInfo, ProjectsResponse } from "../../shared/types.ts";
import { getEncodedProjectName } from "../history/pathUtils.ts";
import { logger } from "../utils/logger.ts";
import { readTextFile, exists, readDir } from "../utils/fs.ts";
import { getHomeDir } from "../utils/os.ts";
import { join } from "node:path";

interface DirectoryEntry {
  path: string;
  name: string;
  isDirectory: boolean;
}

interface SearchDirectoriesResponse {
  directories: DirectoryEntry[];
}

/**
 * Handles GET /api/projects requests
 * Retrieves list of available project directories from Claude configuration
 * @param c - Hono context object
 * @returns JSON response with projects array
 */
export async function handleProjectsRequest(c: Context) {
  try {
    const homeDir = getHomeDir();
    if (!homeDir) {
      return c.json({ error: "Home directory not found" }, 500);
    }

    const claudeConfigPath = `${homeDir}/.claude.json`;

    try {
      const configContent = await readTextFile(claudeConfigPath);
      const config = JSON.parse(configContent);

      if (config.projects && typeof config.projects === "object") {
        const projectPaths = Object.keys(config.projects);

        // Get encoded names for each project, only include projects with history
        const projects: ProjectInfo[] = [];
        for (const path of projectPaths) {
          const encodedName = await getEncodedProjectName(path);
          // Only include projects that have history directories
          if (encodedName) {
            projects.push({
              path,
              encodedName,
            });
          }
        }

        const response: ProjectsResponse = { projects };
        return c.json(response);
      } else {
        const response: ProjectsResponse = { projects: [] };
        return c.json(response);
      }
    } catch (error) {
      // Handle file not found errors in a cross-platform way
      if (error instanceof Error && error.message.includes("No such file")) {
        const response: ProjectsResponse = { projects: [] };
        return c.json(response);
      }
      throw error;
    }
  } catch (error) {
    logger.api.error("Error reading projects: {error}", { error });
    return c.json({ error: "Failed to read projects" }, 500);
  }
}

export async function handleSearchDirectoriesRequest(c: Context) {
  try {
    const body = await c.req.json();
    const { searchPath } = body as { searchPath: string };

    if (!searchPath || typeof searchPath !== "string") {
      return c.json({ error: "Invalid search path" }, 400);
    }

    const homeDir = getHomeDir();
    if (!homeDir) {
      return c.json({ error: "Home directory not found" }, 500);
    }

    let targetPath: string;

    if (searchPath.startsWith("~")) {
      targetPath = join(homeDir, searchPath.slice(1));
    } else if (searchPath.startsWith("/")) {
      targetPath = searchPath;
    } else {
      targetPath = join(homeDir, searchPath);
    }

    if (!(await exists(targetPath))) {
      const parentPath = join(targetPath, "..");

      if (await exists(parentPath)) {
        const entries: DirectoryEntry[] = [];
        for await (const entry of readDir(parentPath)) {
          if (entry.name.toLowerCase().includes(searchPath.split("/").pop()!.toLowerCase())) {
            entries.push({
              path: join(parentPath, entry.name),
              name: entry.name,
              isDirectory: entry.isDirectory,
            });
          }
        }
        return c.json({ directories: entries.slice(0, 20) });
      }

      return c.json({ directories: [] });
    }

    const entries: DirectoryEntry[] = [];
    for await (const entry of readDir(targetPath)) {
      if (entry.isDirectory && !entry.name.startsWith(".")) {
        entries.push({
          path: join(targetPath, entry.name),
          name: entry.name,
          isDirectory: true,
        });
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    return c.json({ directories: entries.slice(0, 50) });
  } catch (error) {
    logger.api.error("Error searching directories: {error}", { error });
    return c.json({ error: "Failed to search directories" }, 500);
  }
}
