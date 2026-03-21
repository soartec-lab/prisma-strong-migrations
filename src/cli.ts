#!/usr/bin/env node
import { Command } from "commander";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { check } from "./checker";
import { consoleReport } from "./reporter/console-reporter";
import { jsonReport } from "./reporter/json-reporter";
import { loadConfig } from "./config/loader";
import { loadCustomRules } from "./rules/loader";
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
    if (config.customRulesDir) {
      const customRules = await loadCustomRules(config.customRulesDir);
      config.customRules = [...(config.customRules ?? []), ...customRules];
    }
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

function findPrismaBin(): string {
  const localPrisma = resolve(process.cwd(), "node_modules", ".bin", "prisma");
  if (existsSync(localPrisma)) return localPrisma;
  return "prisma";
}

async function runCheckAndReport(
  migrationsDir: string,
  config: Awaited<ReturnType<typeof loadConfig>>,
  filePaths?: string[],
): Promise<boolean> {
  const files = filePaths ?? (await findMigrationFiles(migrationsDir));
  const allResults: CheckResult[] = [];

  for (const filePath of files) {
    const sql = await readFile(filePath, "utf-8");
    const results = await check({ sql, config, migrationPath: filePath });
    allResults.push(...results);
  }

  consoleReport(allResults);

  const hasErrors = allResults.some((r) => r.rule.severity === "error");
  const hasWarnings = allResults.some((r) => r.rule.severity === "warning");
  const failOnWarning = config.ci?.failOnWarning ?? false;

  return hasErrors || (failOnWarning && hasWarnings);
}

const migrate = program.command("migrate").description("Run Prisma migrations with safety checks");

migrate
  .command("deploy")
  .description("Check all migrations then run prisma migrate deploy (CI-safe)")
  .allowUnknownOption()
  .option("-c, --config <path>", "path to config file")
  .action(async (options, cmd: Command) => {
    const config = await loadConfig(options.config);
    if (config.customRulesDir) {
      const customRules = await loadCustomRules(config.customRulesDir);
      config.customRules = [...(config.customRules ?? []), ...customRules];
    }
    const migrationsDir = resolve(config.migrationsDir ?? "./prisma/migrations");

    const hasErrors = await runCheckAndReport(migrationsDir, config);

    if (hasErrors) {
      console.error("\n❌ Migration check failed. prisma migrate deploy was NOT executed.");
      process.exit(1);
    }

    const extraArgs = cmd.args;
    const result = spawnSync(findPrismaBin(), ["migrate", "deploy", ...extraArgs], {
      stdio: "inherit",
    });
    process.exit(result.status ?? 0);
  });

migrate
  .command("dev")
  .description("Create migration with --create-only, check it, then apply if safe")
  .allowUnknownOption()
  .option("-c, --config <path>", "path to config file")
  .option("--name <name>", "name of the migration")
  .option("--schema <path>", "path to prisma schema")
  .action(async (options, cmd: Command) => {
    const config = await loadConfig(options.config);
    if (config.customRulesDir) {
      const customRules = await loadCustomRules(config.customRulesDir);
      config.customRules = [...(config.customRules ?? []), ...customRules];
    }
    const migrationsDir = resolve(config.migrationsDir ?? "./prisma/migrations");

    const existingFiles = new Set(await findMigrationFiles(migrationsDir));

    const createOnlyArgs = ["migrate", "dev", "--create-only"];
    if (options.name) createOnlyArgs.push("--name", options.name);
    if (options.schema) createOnlyArgs.push("--schema", options.schema);

    const extraArgs = cmd.args;
    const createResult = spawnSync(findPrismaBin(), [...createOnlyArgs, ...extraArgs], {
      stdio: "inherit",
    });
    if (createResult.status !== 0) {
      process.exit(createResult.status ?? 1);
    }

    const newFiles = (await findMigrationFiles(migrationsDir)).filter((f) => !existingFiles.has(f));

    if (newFiles.length === 0) {
      console.log("No new migrations created.");
      process.exit(0);
    }

    const hasErrors = await runCheckAndReport(migrationsDir, config, newFiles);

    if (hasErrors) {
      console.error(
        "\n❌ Migration check failed. Review the migration files and delete them if needed, then try again.",
      );
      process.exit(1);
    }

    const applyArgs = ["migrate", "dev"];
    if (options.schema) applyArgs.push("--schema", options.schema);
    applyArgs.push(...extraArgs);

    const applyResult = spawnSync(findPrismaBin(), applyArgs, {
      stdio: "inherit",
    });
    process.exit(applyResult.status ?? 0);
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
