import type { CheckResult } from "../rules/types";

export interface ReportItem {
  ruleName: string;
  severity: "error" | "warning";
  migrationPath: string;
  line: number;
  message: string;
  suggestion: string;
}

export interface JsonReport {
  errors: ReportItem[];
  warnings: ReportItem[];
  totalErrors: number;
  totalWarnings: number;
}

export const jsonReport = (results: CheckResult[]): JsonReport => {
  const toItem = (result: CheckResult): ReportItem => ({
    ruleName: result.rule.name,
    severity: result.rule.severity,
    migrationPath: result.statement.raw,
    line: result.statement.line,
    message: result.message,
    suggestion: result.suggestion,
  });

  const errors = results.filter((r) => r.rule.severity === "error").map(toItem);
  const warnings = results.filter((r) => r.rule.severity === "warning").map(toItem);

  return {
    errors,
    warnings,
    totalErrors: errors.length,
    totalWarnings: warnings.length,
  };
};
