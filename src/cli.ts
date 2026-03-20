#!/usr/bin/env node
import { Command } from "commander";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { check } from "./checker";
import { consoleReport } from "./reporter/console-reporter";
import { jsonReport } from "./reporter/json-reporter";
import { loadConfig } from "./config/loader";
import type { CheckResult } from "./rules/types";

const program = new Command();

program
  .name("prisma-strong-migrations")
  .description("Detect dangerous operations in Prisma migrations")
  .version("0.1.0");

program
  .command("check [migration]")
  .description("Check migration files for dangerous operations")
  .option("-f, --format <format>", "output format: console | json", "console")
  .option("-c, --config <path>", "path to config file")
  .option("--no-fail", "exit with code 0 even if errors found")
  .action(async (migration: string | undefined, options) => {
    const config = await loadConfig(options.config);
    const migrationsDir = resolve(config.migrationsDir ?? "./prisma/migrations");
    const ignoreMigrations = config.ignoreMigrations ?? [];

    const allResults: CheckResult[] = [];

    if (migration) {
      const migrationPath = resolve(migration);
      const sql = await readFile(migrationPath, "utf-8");
      const results = await check({ sql, config, migrationPath });
      allResults.push(...results);
    } else {
      const migrationFiles = await findMigrationFiles(migrationsDir);
      for (const filePath of migrationFiles) {
        if (ignoreMigrations.some((pattern) => filePath.includes(pattern))) {
          continue;
        }
        const sql = await readFile(filePath, "utf-8");
        const results = await check({ sql, config, migrationPath: filePath });
        allResults.push(...results);
      }
    }

    if (options.format === "json") {
      const report = jsonReport(allResults);
      console.log(JSON.stringify(report, null, 2));
    } else {
      consoleReport(allResults);
    }

    if (options.fail !== false) {
      const hasErrors = allResults.some((r) => r.rule.severity === "error");
      const hasWarnings = allResults.some((r) => r.rule.severity === "warning");
      const failOnWarning = config.ci?.failOnWarning ?? false;

      if (hasErrors || (failOnWarning && hasWarnings)) {
        process.exit(1);
      }
    }
  });

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

program
  .command("init-rule <name>")
  .description("Generate a custom rule template")
  .action(async (name: string) => {
    const template = `// prisma-strong-migrations-rules/${name}.js
/** @type {import('prisma-strong-migrations').Rule} */
export default {
  name: '${name}',
  severity: 'error',
  description: 'Description of ${name} rule',

  detect: (statement, _context) => {
    // Return true if the statement should be flagged
    return false;
  },

  message: (statement) => {
    return \`Detected issue in \${statement.table ?? 'unknown table'}\`;
  },

  suggestion: (statement) => {
    return \`Review the operation on \${statement.table ?? 'unknown table'} carefully\`;
  },
};
`;
    const dir = "./prisma-strong-migrations-rules";
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, `${name}.js`);
    await writeFile(filePath, template, "utf-8");
    console.log(`Created ${filePath}`);
  });

async function findMigrationFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await findMigrationFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.name === "migration.sql") {
      files.push(fullPath);
    }
  }

  return files.sort();
}

program.parse();
