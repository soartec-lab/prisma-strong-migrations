import { Command } from "commander";
import { resolve } from "node:path";
import { loadConfig } from "../../config/loader";
import { loadCustomRules } from "../../rules/loader";
import { findMigrationFiles } from "../../find-migration-files";
import { runCheckAndReport, runPrisma } from "./prisma-runner";

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

      const existingFiles = new Set(await findMigrationFiles(migrationsDir));

      const createOnlyArgs = ["migrate", "dev", "--create-only"];
      if (options.name) createOnlyArgs.push("--name", options.name);
      if (options.schema) createOnlyArgs.push("--schema", options.schema);

      const createStatus = runPrisma([...createOnlyArgs, ...cmd.args]);
      if (createStatus !== 0) process.exit(createStatus);

      const newFiles = (await findMigrationFiles(migrationsDir)).filter(
        (f) => !existingFiles.has(f),
      );

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
      applyArgs.push(...cmd.args);

      process.exit(runPrisma(applyArgs));
    });
}
