import { Command } from "commander";
import { writeFile } from "node:fs/promises";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Generate a config file template")
    .action(async () => {
      const template = `// prisma-strong-migrations.config.js
/** @type {import('prisma-strong-migrations').Config} */
export default {
  // Disable specific rules by name
  disabledRules: [],

  // Ignore specific migration files (substring patterns)
  ignoreMigrations: [],

  // Directory containing custom rule files
  customRulesDir: './prisma-strong-migrations-rules',

  // Migrations directory
  migrationsDir: './prisma/migrations',

  // Treat warnings as errors
  warningsAsErrors: false,

  // CI settings
  ci: {
    failOnWarning: false,
    failOnError: true,
  },
};
`;
      await writeFile("prisma-strong-migrations.config.js", template, "utf-8");
      console.log("Created prisma-strong-migrations.config.js");
    });
}
