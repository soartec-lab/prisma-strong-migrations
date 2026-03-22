import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { check } from "../../checker";
import { applyFixes, writeFixedSql } from "../../fixer";
import { consoleReport } from "../../reporter/console-reporter";
import { jsonReport } from "../../reporter/json-reporter";
import { loadConfig } from "../../config/loader";
import { loadCustomRules } from "../../rules/loader";
import { findMigrationFiles } from "../find-migration-files";

export function registerCheckCommand(program: Command): void {
  program
    .command("check [migration]")
    .description("Check migration files for dangerous operations")
    .option("-f, --format <format>", "output format: console | json", "console")
    .option("-c, --config <path>", "path to config file")
    .option("--no-fail", "exit with code 0 even if errors found")
    .option("--fix", "automatically fix issues where possible")
    .action(async (migration: string | undefined, options) => {
      const config = await loadConfig(options.config);
      if (config.customRulesDir) {
        const customRules = await loadCustomRules(config.customRulesDir);
        config.customRules = [...(config.customRules ?? []), ...customRules];
      }
      const migrationsDir = resolve(config.migrationsDir ?? "./prisma/migrations");
      const ignoreMigrations = config.ignoreMigrations ?? [];

      const allResults = [];

      if (migration) {
        const migrationPath = resolve(migration);
        const sql = await readFile(migrationPath, "utf-8");
        const results = await check({ sql, config, migrationPath });
        if (options.fix && results.length > 0) {
          const { sql: fixedSql, appliedCount, skippedResults } = applyFixes(sql, results);
          await writeFixedSql(migrationPath, fixedSql);
          if (appliedCount > 0) {
            console.log(`✔ Auto-fixed ${appliedCount} issue(s) in ${migrationPath}`);
          }
          allResults.push(...skippedResults);
        } else {
          allResults.push(...results);
        }
      } else {
        const migrationFiles = await findMigrationFiles(migrationsDir);
        for (const filePath of migrationFiles) {
          if (ignoreMigrations.some((pattern) => filePath.includes(pattern))) {
            continue;
          }
          const sql = await readFile(filePath, "utf-8");
          const results = await check({ sql, config, migrationPath: filePath });
          if (options.fix && results.length > 0) {
            const { sql: fixedSql, appliedCount, skippedResults } = applyFixes(sql, results);
            await writeFixedSql(filePath, fixedSql);
            if (appliedCount > 0) {
              console.log(`✔ Auto-fixed ${appliedCount} issue(s) in ${filePath}`);
            }
            allResults.push(...skippedResults);
          } else {
            allResults.push(...results);
          }
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
        const failOnWarning = config.failOnWarning ?? false;

        if (hasErrors || (failOnWarning && hasWarnings)) {
          process.exit(1);
        }
      }
    });
}
