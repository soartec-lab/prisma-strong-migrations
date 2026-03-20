import { Check, Violation } from "../types";

/**
 * Detects `ALTER COLUMN … SET NOT NULL` on an existing column.
 *
 * Setting NOT NULL on an existing column requires a full table scan to verify
 * that no existing rows have a NULL value in that column, and acquires a lock
 * while doing so.
 *
 * Safe strategy:
 * 1. Add a `CHECK (column IS NOT NULL) NOT VALID` constraint (PostgreSQL 12+).
 * 2. `VALIDATE CONSTRAINT` in a separate transaction (acquires only a
 *    `SHARE UPDATE EXCLUSIVE` lock).
 * 3. Then add `SET NOT NULL` — PostgreSQL will skip the table scan when a
 *    validated constraint is present.
 */
export const setNotNull: Check = {
  name: "set_not_null",

  detect(sql: string): boolean {
    return /\bSET\s+NOT\s+NULL\b/i.test(sql);
  },

  buildViolation(statement: string, line: number): Violation {
    return {
      check: this.name,
      message:
        "Setting NOT NULL on an existing column requires a full table scan " +
        "and acquires a lock while verifying no rows contain NULL. " +
        "On PostgreSQL 12+, consider adding a `CHECK (col IS NOT NULL) " +
        "NOT VALID` constraint first, validating it separately, then " +
        "setting NOT NULL.",
      statement,
      line,
    };
  },
};
