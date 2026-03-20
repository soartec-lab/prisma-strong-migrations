import { Check, Violation } from "../types";

/**
 * Detects `ADD COLUMN … NOT NULL` without a `DEFAULT` clause.
 *
 * On PostgreSQL < 11, adding a NOT NULL column without a DEFAULT causes a
 * full table rewrite, which can take a very long time on large tables and
 * locks the table for the duration. Even on PostgreSQL 11+, if a DEFAULT is
 * later added it can still trigger unexpected behavior during deploys.
 *
 * Safe strategy:
 * 1. Add the column as nullable first.
 * 2. Back-fill existing rows.
 * 3. Set NOT NULL once all rows have a value.
 */
export const addColumnNotNull: Check = {
  name: "add_column_not_null",

  detect(sql: string): boolean {
    // Look for ADD COLUMN definitions that include NOT NULL but lack a DEFAULT.
    // We normalize whitespace so multi-line statements are handled correctly.
    const normalized = sql.replace(/\s+/g, " ");

    // Find every ADD COLUMN clause within the statement.
    const addColumnPattern = /ADD\s+COLUMN\s+\S+\s+[^,;)]+/gi;
    let match: RegExpExecArray | null;

    while ((match = addColumnPattern.exec(normalized)) !== null) {
      const clause = match[0];
      if (/\bNOT\s+NULL\b/i.test(clause) && !/\bDEFAULT\b/i.test(clause)) {
        return true;
      }
    }
    return false;
  },

  buildViolation(statement: string, line: number): Violation {
    return {
      check: this.name,
      message:
        "Adding a NOT NULL column without a DEFAULT can cause a full table " +
        "rewrite on older PostgreSQL versions and blocks reads/writes during " +
        "the operation. Add the column as nullable first, back-fill existing " +
        "rows, and then set NOT NULL.",
      statement,
      line,
    };
  },
};
