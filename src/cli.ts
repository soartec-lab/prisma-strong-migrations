#!/usr/bin/env node
import { Command } from "commander";
import { registerCheckCommand } from "./cli/check";
import { registerInitCommand } from "./cli/init";
import { registerInitRuleCommand } from "./cli/init-rule";
import { registerMigrateCommand } from "./cli/migrate/index";

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
