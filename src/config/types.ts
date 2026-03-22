import type { Rule } from "../rules/types";

export interface Config {
  disabledRules?: string[];
  ignoreMigrations?: string[];
  customRulesDir?: string;
  customRules?: Rule[];
  warningsAsErrors?: boolean;
  failOnWarning?: boolean;
  failOnError?: boolean;
  migrationsDir?: string;
}

export const DEFAULT_CONFIG: Required<Config> = {
  disabledRules: [],
  ignoreMigrations: [],
  customRulesDir: "./prisma-strong-migrations-rules",
  customRules: [],
  warningsAsErrors: false,
  failOnWarning: false,
  failOnError: true,
  migrationsDir: "./prisma/migrations",
};
