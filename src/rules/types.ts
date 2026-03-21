import type { ParsedStatement } from "../parser/types";
import type { Config } from "../config/types";

export type Severity = "error" | "warning";

export interface CheckContext {
  statements: ParsedStatement[];
  migrationPath: string;
  config: Config;
}

export interface FixResult {
  /** SQL statements replacing the original (without trailing semicolons) */
  statements: string[];
  /** If true, the file needs a -- prisma-migrate-disable-next-transaction header */
  requiresDisableTransaction?: boolean;
}

export interface Rule {
  name: string;
  severity: Severity;
  description: string;
  detect: (statement: ParsedStatement, context: CheckContext) => boolean;
  message: (statement: ParsedStatement) => string;
  suggestion: (statement: ParsedStatement) => string;
  /** Auto-fix: defined only when the fix is purely SQL and mechanically safe */
  fix?: (statement: ParsedStatement) => FixResult;
}

export interface CheckResult {
  rule: Rule;
  statement: ParsedStatement;
  message: string;
  suggestion: string;
}
