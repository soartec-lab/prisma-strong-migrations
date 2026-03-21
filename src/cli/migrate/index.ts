import { Command } from "commander";
import { registerDeployCommand } from "./deploy";
import { registerDevCommand } from "./dev";

export function registerMigrateCommand(program: Command): void {
  const migrate = program
    .command("migrate")
    .description("Run Prisma migrations with safety checks");

  registerDeployCommand(migrate);
  registerDevCommand(migrate);
}
