import { join } from "node:path";
import { getHomeDir } from "./os.ts";
import { exists, readTextFile } from "./fs.ts";
import { logger } from "./logger.ts";

interface PermissionRules {
  allow: string[];
  deny: string[];
}

interface ClaudeSettings {
  permissions?: PermissionRules;
}

export interface PermissionConfig {
  allowedTools: string[];
  disallowedTools: string[];
}

function getClaudeConfigDir(): string | null {
  const home = getHomeDir();
  if (!home) {
    return null;
  }
  return join(home, ".claude");
}

async function loadSettingsFile(filePath: string): Promise<ClaudeSettings | null> {
  try {
    if (!(await exists(filePath))) {
      return null;
    }
    const content = await readTextFile(filePath);
    return JSON.parse(content) as ClaudeSettings;
  } catch {
    return null;
  }
}

function parsePermissionRule(rule: string): string[] {
  const match = rule.match(/^(\w+)(?:\((.+)\))?$/);
  if (!match) {
    return [];
  }
  return [match[1]];
}

export async function getPermissionConfig(): Promise<PermissionConfig> {
  const configDir = getClaudeConfigDir();
  if (!configDir) {
    return { allowedTools: [], disallowedTools: [] };
  }

  const settingsPath = join(configDir, "settings.json");
  const localSettingsPath = join(configDir, "settings.local.json");

  const [settings, localSettings] = await Promise.all([
    loadSettingsFile(settingsPath),
    loadSettingsFile(localSettingsPath),
  ]);

  const allowRules = new Set<string>();
  const denyRules = new Set<string>();

  if (settings?.permissions) {
    for (const r of settings.permissions.allow) allowRules.add(r);
    for (const r of settings.permissions.deny) denyRules.add(r);
  }

  if (localSettings?.permissions) {
    for (const r of localSettings.permissions.allow) allowRules.add(r);
    for (const r of localSettings.permissions.deny) denyRules.add(r);
  }

  const allowedTools = new Set<string>();
  const disallowedTools = new Set<string>();

  for (const rule of allowRules) {
    for (const tool of parsePermissionRule(rule)) {
      allowedTools.add(tool);
    }
  }

  for (const rule of denyRules) {
    for (const tool of parsePermissionRule(rule)) {
      disallowedTools.add(tool);
    }
  }

  const config: PermissionConfig = {
    allowedTools: Array.from(allowedTools),
    disallowedTools: Array.from(disallowedTools),
  };

  if (config.allowedTools.length > 0 || config.disallowedTools.length > 0) {
    logger.chat.debug("权限配置: {config}", { config });
  }

  return config;
}