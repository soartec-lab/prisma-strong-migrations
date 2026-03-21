import chalk from "chalk";
import type { CheckResult } from "../rules/types";

export const consoleReport = (results: CheckResult[]): void => {
  if (results.length === 0) {
    console.log(chalk.green("✓ No issues found"));
    return;
  }

  const byFile = Map.groupBy(results, (r) => r.statement.migrationPath ?? "unknown");

  for (const [filePath, fileResults] of byFile) {
    console.log();
    console.log(chalk.cyan.bold(filePath));

    for (const { rule, statement, message, suggestion } of fileResults) {
      const severity = rule.severity === "error" ? chalk.red("error") : chalk.yellow("warning");

      console.log();
      console.log(`${severity} [${chalk.bold(rule.name)}] ${chalk.dim(`line ${statement.line}`)}`);
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
