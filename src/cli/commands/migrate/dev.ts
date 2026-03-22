import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { readFileSync, rmSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { check } from "../../../checker";
import { applyFixes, writeFixedSql } from "../../../fixer";
import { consoleReport } from "../../../reporter/console-reporter";
import { loadConfig } from "../../../config/loader";
import { loadCustomRules } from "../../../rules/loader";
import { findMigrationFiles } from "../../find-migration-files";
import type { CheckResult } from "../../../rules/types";
import {
  getPendingMigrationNames,
  migrationNameFromPath,
  runPrisma,
} from "../../prisma-runner";

export function registerDevCommand(migrate: Command): void {
  migrate
    .command("dev")
    .description("Create migration with --create-only, check it, then apply if safe")
    .allowUnknownOption()
    .option("-c, --config <path>", "path to config file")
    .option("--name <name>", "name of the migration")
    .option("--schema <path>", "path to prisma schema")
    .option("--fix", "automatically fix issues where possible, then apply")
    .action(async (options, cmd: Command) => {
      const config = await loadConfig(options.config);
      if (config.customRulesDir) {
        const customRules = await loadCustomRules(config.customRulesDir);
        config.customRules = [...(config.customRules ?? []), ...customRules];
      }
      const migrationsDir = resolve(config.migrationsDir ?? "./prisma/migrations");

      const createOnlyArgs = ["migrate", "dev", "--create-only"];
      if (options.name) createOnlyArgs.push("--name", options.name);
      if (options.schema) createOnlyArgs.push("--schema", options.schema);

      // If there are already pending migrations on disk, skip --create-only and
      // re-check them. Running --create-only again would cause Prisma to apply
      // the pending (possibly unfixed) migrations before creating a new one.
      const existingPendingNames = getPendingMigrationNames(options.schema);
      const allFilesBeforeCreate = await findMigrationFiles(migrationsDir);
      // When status cannot be determined (null), treat all disk files as
      // potentially pending to avoid accidentally applying unfixed migrations.
      const existingPendingFiles =
        existingPendingNames !== null
          ? allFilesBeforeCreate.filter((f) =>
              existingPendingNames.has(migrationNameFromPath(f)),
            )
          : allFilesBeforeCreate;

      if (existingPendingFiles.length === 0) {
        const createStatus = runPrisma([...createOnlyArgs, ...cmd.args]);
        if (createStatus !== 0) process.exit(createStatus);
      }

      // Ask Prisma which migrations are pending. Prisma loads .env automatically
      // so DATABASE_URL does not need to be in process.env.
      // Falls back to checking all disk files when status cannot be determined.
      const pendingNames = getPendingMigrationNames(options.schema);
      const allFiles = await findMigrationFiles(migrationsDir);
      const pendingFiles =
        pendingNames !== null
          ? allFiles.filter((f) => pendingNames.has(migrationNameFromPath(f)))
          : allFiles;

      // Immediately delete empty pending files. Prisma generates these when a
      // pending migration already covers the schema diff — they are pure noise.
      // Non-empty files are kept regardless of check outcome so the user can
      // edit and retry.
      const checkFiles = pendingFiles.filter((f) => {
        if (readFileSync(f, "utf-8").trim().startsWith("-- This is an empty migration")) {
          rmSync(dirname(f), { recursive: true, force: true });
          return false;
        }
        return true;
      });

      // Run check and collect all results
      const allResults: CheckResult[] = [];
      for (const filePath of checkFiles) {
        const sql = await readFile(filePath, "utf-8");
        const results = await check({ sql, config, migrationPath: filePath });
        allResults.push(...results);
      }

      // When --fix is set, skip reporting — fixable errors will be silently
      // corrected below, and unfixable ones will be reported after the fix attempt.
      if (!options.fix) {
        consoleReport(allResults);
      }

      const failOnWarning = config.ci?.failOnWarning ?? false;
      const errorResults = allResults.filter((r) => r.rule.severity === "error");
      const warnResults = allResults.filter((r) => r.rule.severity === "warning");
      const hasErrors = errorResults.length > 0 || (failOnWarning && warnResults.length > 0);

      if (hasErrors) {
        const allErrorsFixable = errorResults.every((r) => r.rule.fix);

        if (options.fix) {
          // Apply auto-fixes to each file
          for (const filePath of checkFiles) {
            const sql = await readFile(filePath, "utf-8");
            const fileResults = allResults.filter(
              (r) => r.statement.migrationPath === filePath,
            );
            if (fileResults.length === 0) continue;
            const { sql: fixedSql, appliedCount, skippedResults } = applyFixes(sql, fileResults);
            if (appliedCount > 0) {
              await writeFixedSql(filePath, fixedSql);
              console.log(
                `✔ Auto-fixed ${appliedCount} issue(s) in ${relative(process.cwd(), filePath)}`,
              );
            }
            if (skippedResults.some((r) => r.rule.severity === "error")) {
              console.error(
                "\n❌ Some issues could not be auto-fixed. Edit the migration files to fix the remaining issues, then try again.",
              );
              process.exit(1);
            }
          }
          console.log("\n✅ Auto-fix applied. Run the same command again (without --fix) to apply the migration.");
          process.exit(0);
        } else {
          if (allErrorsFixable) {
            console.error("\n❌ Migration check failed.");
            console.error(
              "\n💡 These issues can be auto-fixed (migration SQL only — schema.prisma will not be changed).",
            );
            console.error("   If this looks correct, run with --fix to apply:\n");
            console.error("   vp exec prisma-strong-migrations migrate dev --fix\n");
          } else {
            console.error(
              "\n❌ Migration check failed. Edit the migration files to fix the issues, then try again.",
            );
          }
          process.exit(1);
        }
      }

      // --fix is fix-only: never apply the migration, even if there are no errors.
      if (options.fix) {
        console.log("✓ No issues to fix.");
        process.exit(0);
      }

      const applyArgs = ["migrate", "dev"];
      if (options.schema) applyArgs.push("--schema", options.schema);
      applyArgs.push(...cmd.args);

      process.exit(runPrisma(applyArgs));
    });
}
