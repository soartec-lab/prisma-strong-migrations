import { Check, Violation } from "../types";

/**
 * Detects adding a UNIQUE constraint via `ADD CONSTRAINT … UNIQUE` or
 * `ADD UNIQUE`.
 *
 * Adding a unique constraint requires a full table scan and index build while
 * holding an `ACCESS EXCLUSIVE` lock on the table, blocking all reads and
 * writes.
 *
 * Safe strategy: Create a `UNIQUE INDEX CONCURRENTLY` first, then add the
 * constraint using the existing index:
 * ```sql
 * CREATE UNIQUE INDEX CONCURRENTLY idx_name ON table(col);
 * ALTER TABLE table ADD CONSTRAINT cname UNIQUE USING INDEX idx_name;
 * ```
 */
export const addUniqueConstraint: Check = {
  name: "add_unique_constraint",

  detect(sql: string): boolean {
    return (
      /\bADD\s+(?:CONSTRAINT\s+\S+\s+)?UNIQUE\b/i.test(sql) &&
      // Exclude UNIQUE INDEX CONCURRENTLY — that is already handled separately.
      !/\bCREATE\s+UNIQUE\s+INDEX\s+CONCURRENTLY\b/i.test(sql)
    );
  },

  buildViolation(statement: string, line: number): Violation {
    return {
      check: this.name,
      message:
        "Adding a UNIQUE constraint acquires an ACCESS EXCLUSIVE lock and " +
        "requires a full table scan. Consider creating a " +
        "`UNIQUE INDEX CONCURRENTLY` first and then adding the constraint " +
        "using the existing index to avoid locking.",
      statement,
      line,
    };
  },
};
