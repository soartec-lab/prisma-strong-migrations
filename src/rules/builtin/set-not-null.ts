import type { Rule } from "../types";

export const setNotNullRule: Rule = {
  name: "set_not_null",
  code: "011",
  severity: "error",
  description: "Setting NOT NULL on a column locks the table",

  detect: (stmt) => stmt.type === "alterTable" && stmt.action === "alterColumnSetNotNull",

  message: (stmt) =>
    `Setting NOT NULL on column "${stmt.column}" in table "${stmt.table}" locks the table`,

  suggestion: (stmt) =>
    `
❌ Bad: Setting NOT NULL directly validates all existing rows and locks the table

✅ Good: Follow these steps:
   1. Add a CHECK constraint with NOT VALID to avoid full table scan:
      ALTER TABLE "${stmt.table}" ADD CONSTRAINT "${stmt.table}_${stmt.column}_not_null"
        CHECK ("${stmt.column}" IS NOT NULL) NOT VALID;
   2. Validate the constraint in a separate transaction:
      ALTER TABLE "${stmt.table}" VALIDATE CONSTRAINT "${stmt.table}_${stmt.column}_not_null";
   3. Then set NOT NULL (PostgreSQL 12+ will skip the scan if CHECK constraint exists):
      ALTER TABLE "${stmt.table}" ALTER COLUMN "${stmt.column}" SET NOT NULL;
   4. Drop the temporary check constraint:
      ALTER TABLE "${stmt.table}" DROP CONSTRAINT "${stmt.table}_${stmt.column}_not_null";

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line set_not_null
`.trim(),
};
