import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "../types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "alterTable" && statement.action === "alterColumnSetNotNull";
};

const message = (statement: ParsedStatement): string => {
  return `Setting NOT NULL on column "${statement.column}" in table "${statement.table}" locks the table`;
};

const suggestion = (statement: ParsedStatement): string => {
  return `
❌ Bad: Setting NOT NULL directly validates all existing rows and locks the table

✅ Good: Follow these steps:
   1. Add a CHECK constraint with NOT VALID to avoid full table scan:
      ALTER TABLE "${statement.table}" ADD CONSTRAINT "${statement.table}_${statement.column}_not_null"
        CHECK ("${statement.column}" IS NOT NULL) NOT VALID;
   2. Validate the constraint in a separate transaction:
      ALTER TABLE "${statement.table}" VALIDATE CONSTRAINT "${statement.table}_${statement.column}_not_null";
   3. Then set NOT NULL (PostgreSQL 12+ will skip the scan if CHECK constraint exists):
      ALTER TABLE "${statement.table}" ALTER COLUMN "${statement.column}" SET NOT NULL;
   4. Drop the temporary check constraint:
      ALTER TABLE "${statement.table}" DROP CONSTRAINT "${statement.table}_${statement.column}_not_null";

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line set_not_null
`.trim();
};

export const setNotNullRule: Rule = {
  name: "set_not_null",
  severity: "error",
  description: "Setting NOT NULL on a column locks the table",
  detect,
  message,
  suggestion,
};
