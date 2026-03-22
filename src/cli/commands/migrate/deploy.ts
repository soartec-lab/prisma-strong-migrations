import { Command } from "commander";
import { resolve } from "node:path";
import { loadConfig } from "../../../config/loader";
import { loadCustomRules } from "../../../rules/loader";
import { runCheckAndReport, runPrisma } from "../../prisma-runner";

export function registerDeployCommand(migrate: Command): void {
  migrate
    .command("deploy")
    .description("Check all migrations then run prisma migrate deploy (CI-safe)")
    .allowUnknownOption()
    .option("-c, --config <path>", "path to config file")
    .option("--force", "skip all safety checks (use only for local dev environment setup)")
    .action(async (options, cmd: Command) => {
      if (options.force) {
        console.warn(
          "⚠️  --force: Safety checks skipped. Use only for local dev environment setup.",
        );
        process.exit(runPrisma(["migrate", "deploy", ...cmd.args]));
      }

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

      process.exit(runPrisma(["migrate", "deploy", ...cmd.args]));
    });
}
