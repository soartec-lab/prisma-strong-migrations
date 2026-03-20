import type { ParsedStatement } from "../parser/types";
import type { Config } from "../config/types";

export type Severity = "error" | "warning";

export interface CheckContext {
  statements: ParsedStatement[];
  migrationPath: string;
  config: Config;
}

export interface Rule {
  name: string;
  severity: Severity;
  description: string;
  detect: (statement: ParsedStatement, context: CheckContext) => boolean;
  message: (statement: ParsedStatement) => string;
  suggestion: (statement: ParsedStatement) => string;
}

export interface CheckResult {
  rule: Rule;
  statement: ParsedStatement;
  message: string;
  suggestion: string;
}
