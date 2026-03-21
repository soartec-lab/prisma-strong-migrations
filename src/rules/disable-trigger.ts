import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "disableTrigger";
};

const message = (statement: ParsedStatement): string => {
  return statement.table
    ? `DISABLE TRIGGER on "${statement.table}" may break data integrity by bypassing foreign key and constraint checks`
    : "DISABLE TRIGGER may break data integrity by bypassing foreign key and constraint checks";
};

const suggestion = (statement: ParsedStatement): string => {
  const table = statement.table ?? "table_name";
  return `
❌ Bad: DISABLE TRIGGER disables foreign key and other constraint triggers on "${table}",
   which can silently corrupt data integrity

✅ Good: Do not disable triggers in migrations. If unavoidable:
   1. Ensure ENABLE TRIGGER is called before the migration ends
   2. Verify all foreign key constraints are still valid after re-enabling

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line disableTrigger
`.trim();
};

export const disableTriggerRule: Rule = {
  name: "disableTrigger",
  severity: "error",
  description: "DISABLE TRIGGER bypasses constraint checks and may corrupt data integrity",
  detect,
  message,
  suggestion,
};
