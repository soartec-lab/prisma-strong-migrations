import { Check, Violation } from "../types";

/**
 * Detects `RENAME TO` statements (renaming a table).
 *
 * Renaming a table is dangerous because existing application code, queries,
 * views, and foreign key constraints may still reference the old table name.
 *
 * Safe strategy: Use a view with the old name pointing to the new table while
 * you update all application references, then drop the view.
 */
export const renameTable: Check = {
  name: "rename_table",

  detect(sql: string): boolean {
    // ALTER TABLE … RENAME TO …
    return /\bRENAME\s+TO\b/i.test(sql);
  },

  buildViolation(statement: string, line: number): Violation {
    return {
      check: this.name,
      message:
        "Renaming a table is dangerous. Existing application code and " +
        "queries that reference the old table name will break immediately. " +
        "Consider creating a view with the old name or updating all " +
        "application references before renaming.",
      statement,
      line,
    };
  },
};
