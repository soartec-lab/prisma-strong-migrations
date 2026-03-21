#!/usr/bin/env node
import { Command } from "commander";
import { registerCheckCommand } from "./commands/check";
import { registerInitCommand } from "./commands/init";
import { registerInitRuleCommand } from "./commands/init-rule";
import { registerDeployCommand } from "./commands/migrate/deploy";
import { registerDevCommand } from "./commands/migrate/dev";

const program = new Command();

program
  .name("prisma-strong-migrations")
  .description("Detect dangerous operations in Prisma migrations")
  .version("0.1.0");

registerCheckCommand(program);
registerInitCommand(program);
registerInitRuleCommand(program);

const migrate = program.command("migrate").description("Run Prisma migrations with safety checks");

registerDeployCommand(migrate);
registerDevCommand(migrate);

program.parse();
