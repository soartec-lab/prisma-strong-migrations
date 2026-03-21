import { Command } from "commander";
import { readFileSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { resolve } from "node:path";
import { loadConfig } from "../../../config/loader";
import { loadCustomRules } from "../../../rules/loader";
import { findMigrationFiles } from "../../find-migration-files";
import {
  getPendingMigrationNames,
  migrationNameFromPath,
  runCheckAndReport,
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

      const createStatus = runPrisma([...createOnlyArgs, ...cmd.args]);
      if (createStatus !== 0) process.exit(createStatus);

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

      const hasErrors = await runCheckAndReport(migrationsDir, config, checkFiles);

      if (hasErrors) {
        console.error(
          "\n❌ Migration check failed. Edit the migration files to fix the issues, then try again.",
        );
        process.exit(1);
      }

      const applyArgs = ["migrate", "dev"];
      if (options.schema) applyArgs.push("--schema", options.schema);
      applyArgs.push(...cmd.args);

      process.exit(runPrisma(applyArgs));
    });
}
