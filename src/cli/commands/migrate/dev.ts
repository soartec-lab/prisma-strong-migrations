import { Command } from "commander";
import { rmSync } from "node:fs";
import { dirname } from "node:path";
import { resolve } from "node:path";
import { loadConfig } from "../../../config/loader";
import { loadCustomRules } from "../../../rules/loader";
import { findMigrationFiles } from "../../find-migration-files";
import { runCheckAndReport, runPrisma } from "../../prisma-runner";

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

      // Treat newly generated files as temporary: register a cleanup handler that
      // deletes them on process exit. If the check passes, we remove the handler
      // so the files are kept.
      const cleanup = () => {
        for (const file of newFiles) {
          rmSync(dirname(file), { recursive: true, force: true });
        }
      };
      process.on("exit", cleanup);
      process.on("SIGINT", () => { cleanup(); process.exit(130); });
      process.on("SIGTERM", () => { cleanup(); process.exit(143); });

      const hasErrors = await runCheckAndReport(migrationsDir, config);

      if (hasErrors) {
        console.error(
          "\n❌ Migration check failed. The generated migration files have been deleted. Fix the issues and try again.",
        );
        process.exit(1);
      }

      // Check passed — unregister cleanup so the files are kept
      process.off("exit", cleanup);
      process.off("SIGINT", cleanup);
      process.off("SIGTERM", cleanup);

      const applyArgs = ["migrate", "dev"];
      if (options.schema) applyArgs.push("--schema", options.schema);
      applyArgs.push(...cmd.args);

      process.exit(runPrisma(applyArgs));
    });
}
