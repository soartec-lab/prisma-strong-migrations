#!/usr/bin/env node
import { Command } from "commander";
import { registerCheckCommand } from "./commands/check";
import { registerInitCommand } from "./commands/init";
import { registerInitRuleCommand } from "./commands/init-rule";
import { registerMigrateCommand } from "./commands/migrate/index";

const program = new Command();

program
  .name("prisma-strong-migrations")
  .description("Detect dangerous operations in Prisma migrations")
  .version("0.1.0");

registerCheckCommand(program);
registerInitCommand(program);
registerInitRuleCommand(program);
registerMigrateCommand(program);

program.parse();
