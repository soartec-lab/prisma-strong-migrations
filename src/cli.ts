#!/usr/bin/env node
import * as path from "path";
import * as process from "process";
import { checkMigrationsDir, checkMigrationFile } from "./checker";
import { CheckResult } from "./types";

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";

function printResults(results: CheckResult[]): void {
  let totalViolations = 0;

  for (const result of results) {
    if (result.violations.length === 0) continue;

    console.log(`\n${BOLD}${CYAN}${result.filePath}${RESET}`);

    for (const violation of result.violations) {
      totalViolations++;
      console.log(
        `  ${RED}[${violation.check}]${RESET} line ${violation.line}`,
      );
      console.log(`  ${YELLOW}${violation.message}${RESET}`);
      console.log(
        `  Statement: ${violation.statement.split("\n")[0].trim()}${
          violation.statement.includes("\n") ? " ..." : ""
        }`,
      );
    }
  }

  if (totalViolations === 0) {
    console.log("✅  No unsafe migrations detected.");
  } else {
    console.log(
      `\n${RED}${BOLD}Found ${totalViolations} unsafe operation(s) across ${
        results.filter((r) => r.violations.length > 0).length
      } file(s).${RESET}`,
    );
  }
}

function usage(): void {
  console.log(
    `Usage: strong-prisma <migrations-dir-or-file> [<file2> ...]

Examples:
  strong-prisma prisma/migrations
  strong-prisma prisma/migrations/20240101_add_users/migration.sql
  strong-prisma path/to/migration1.sql path/to/migration2.sql
`,
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    usage();
    process.exit(1);
  }

  const results: CheckResult[] = [];

  for (const arg of args) {
    const resolved = path.resolve(arg);
    const { statSync } = await import("fs");
    let stat;
    try {
      stat = statSync(resolved);
    } catch {
      console.error(`${RED}Error: Path not found: ${arg}${RESET}`);
      process.exit(1);
    }

    if (stat.isDirectory()) {
      results.push(...checkMigrationsDir(resolved));
    } else {
      results.push(checkMigrationFile(resolved));
    }
  }

  printResults(results);

  const hasViolations = results.some((r) => r.violations.length > 0);
  process.exit(hasViolations ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
