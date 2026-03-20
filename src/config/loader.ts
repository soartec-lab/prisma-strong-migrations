import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Config } from "./types";
import { DEFAULT_CONFIG } from "./types";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export async function loadConfig(configPath?: string): Promise<Config> {
  const path = configPath ? resolve(configPath) : resolve("prisma-strong-migrations.config.js");

  if (!existsSync(path)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const module = await import(path);
    const userConfig: Config = module.default ?? module;
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch (error) {
    throw new ConfigError(`Failed to load config from ${path}: ${error}`);
  }
}
