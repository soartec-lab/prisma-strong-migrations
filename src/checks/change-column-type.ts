import { Check, Violation } from "../types";

/**
 * Detects `ALTER COLUMN … TYPE` (changing a column's data type).
 *
 * Changing a column type typically requires a full table rewrite in
 * PostgreSQL unless the new type is binary-compatible with the old one
 * (e.g. `varchar(50)` → `varchar(100)`). During the rewrite the table is
 * locked and all reads and writes are blocked.
 *
 * Safe strategy:
 * 1. Add a new column with the desired type.
 * 2. Dual-write to both columns.
 * 3. Migrate existing data in batches.
 * 4. Switch reads to the new column.
 * 5. Drop the old column.
 */
export const changeColumnType: Check = {
  name: "change_column_type",

  detect(sql: string): boolean {
    // PostgreSQL: ALTER TABLE … ALTER COLUMN … TYPE …
    // Also matches ALTER TABLE … ALTER COLUMN … SET DATA TYPE …
    return /\bALTER\s+(?:TABLE\s+\S+\s+)?(?:COLUMN\s+)?\S+\s+(?:SET\s+DATA\s+)?TYPE\b/i.test(
      sql,
    );
  },

  buildViolation(statement: string, line: number): Violation {
    return {
      check: this.name,
      message:
        "Changing a column type requires a full table rewrite in PostgreSQL " +
        "for most type conversions, blocking reads and writes during the " +
        "operation. Consider adding a new column with the desired type and " +
        "migrating data in batches instead.",
      statement,
      line,
    };
  },
};
