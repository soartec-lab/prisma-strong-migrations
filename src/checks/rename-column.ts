import { Check, Violation } from "../types";

/**
 * Detects `RENAME COLUMN` statements.
 *
 * Renaming a column is dangerous because existing application code, queries,
 * and views may still reference the old column name. The rename takes effect
 * immediately, which causes those references to fail.
 *
 * Safe strategy:
 * 1. Add a new column with the desired name.
 * 2. Dual-write to both columns.
 * 3. Back-fill the new column.
 * 4. Update application code to use the new column name.
 * 5. Drop the old column.
 */
export const renameColumn: Check = {
  name: "rename_column",

  detect(sql: string): boolean {
    return /\bRENAME\s+COLUMN\b/i.test(sql);
  },

  buildViolation(statement: string, line: number): Violation {
    return {
      check: this.name,
      message:
        "Renaming a column is dangerous. Existing application code and " +
        "queries that reference the old column name will break immediately. " +
        "Consider adding a new column with the desired name and migrating " +
        "data instead, then dropping the old column.",
      statement,
      line,
    };
  },
};
