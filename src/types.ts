/**
 * Represents a single violation found in a migration file.
 */
export interface Violation {
  /** The name/code identifying the type of check that failed. */
  check: string;
  /** Human-readable message explaining why this operation is dangerous. */
  message: string;
  /** The SQL statement (or fragment) that triggered the violation. */
  statement: string;
  /** 1-based line number in the migration file where the statement starts. */
  line: number;
}

/**
 * Result of checking a migration file.
 */
export interface CheckResult {
  /** Absolute or relative path to the migration file that was checked. */
  filePath: string;
  /** All violations found in the file, in order of occurrence. */
  violations: Violation[];
}

/**
 * A single safety check that can be applied to a SQL statement.
 */
export interface Check {
  /** Short identifier for the check (e.g. "drop_column"). */
  name: string;
  /** Tests whether the given SQL statement triggers this check. */
  detect(sql: string): boolean;
  /** Builds a violation object for a triggering statement. */
  buildViolation(statement: string, line: number): Violation;
}
