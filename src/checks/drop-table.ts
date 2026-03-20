import { Check, Violation } from "../types";

/**
 * Detects `DROP TABLE` statements.
 *
 * Dropping a table is dangerous because:
 * - Application code or ORM models may still reference it.
 * - The operation is irreversible without a backup.
 *
 * Safe strategy: Ensure no application code references the table and that
 * a recent backup exists before dropping it.
 */
export const dropTable: Check = {
  name: "drop_table",

  detect(sql: string): boolean {
    return /\bDROP\s+TABLE\b/i.test(sql);
  },

  buildViolation(statement: string, line: number): Violation {
    return {
      check: this.name,
      message:
        "Dropping a table is dangerous. Your application may still " +
        "reference the table. Remove all references from your application " +
        "code and ensure a backup exists before dropping it.",
      statement,
      line,
    };
  },
};
