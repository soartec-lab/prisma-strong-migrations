import chalk from "chalk";
import type { CheckResult } from "../rules/types";

export const consoleReport = (results: CheckResult[]): void => {
  if (results.length === 0) {
    console.log(chalk.green("✓ No issues found"));
    return;
  }

  for (const result of results) {
    const { rule, statement, message, suggestion } = result;
    const severity = rule.severity === "error" ? chalk.red("error") : chalk.yellow("warning");
    const location = `${statement.migrationPath} line ${statement.line}`;

    console.log();
    console.log(`${severity} [${chalk.bold(rule.name)}] ${chalk.dim(location)}`);
    console.log(`  ${chalk.white(message)}`);
    console.log();
    console.log(
      chalk.dim(
        suggestion
          .split("\n")
          .map((l) => `  ${l}`)
          .join("\n"),
      ),
    );
    console.log(chalk.dim("─".repeat(60)));
  }

  const errors = results.filter((r) => r.rule.severity === "error").length;
  const warnings = results.filter((r) => r.rule.severity === "warning").length;

  console.log();
  if (errors > 0) {
    console.log(
      chalk.red(`✗ ${errors} error${errors !== 1 ? "s" : ""}`) +
        (warnings > 0 ? chalk.yellow(`, ${warnings} warning${warnings !== 1 ? "s" : ""}`) : ""),
    );
  } else {
    console.log(chalk.yellow(`⚠ ${warnings} warning${warnings !== 1 ? "s" : ""}`));
  }
};
