import { Check, Violation } from "../types";

/**
 * Detects `DROP COLUMN` statements.
 *
 * Dropping a column is dangerous because:
 * - Your application code or ORM models may still reference the column.
 * - Active queries can fail immediately after the migration runs.
 *
 * Safe strategy: Deploy code that no longer reads/writes the column before
 * dropping it, or use `ignored_columns` in your ORM to stop reading it first.
 */
export const dropColumn: Check = {
  name: "drop_column",

  detect(sql: string): boolean {
    return /\bDROP\s+COLUMN\b/i.test(sql);
  },

  buildViolation(statement: string, line: number): Violation {
    return {
      check: this.name,
      message:
        "Dropping a column is dangerous. Your application may still " +
        "reference the column. Remove all references to the column from your " +
        "application code before dropping it.",
      statement,
      line,
    };
  },
};
