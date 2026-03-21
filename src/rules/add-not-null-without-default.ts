import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return (
    statement.type === "alterTable" &&
    statement.action === "addColumn" &&
    statement.notNull === true &&
    !statement.hasDefault
  );
};

const message = (statement: ParsedStatement): string => {
  return `Adding NOT NULL column "${statement.column}" without a default value will fail if the table has existing rows`;
};

const suggestion = (statement: ParsedStatement): string => {
  return `
❌ Bad: Adding a NOT NULL column without a default value fails on tables with existing rows

✅ Good: Add the column with a temporary default value, then remove it if needed:

   Migration 1 — Add column with a default value:
      ALTER TABLE "${statement.table}" ADD COLUMN "${statement.column}" <type> NOT NULL DEFAULT <value>;

   Migration 2 — Remove the default if it was only needed for backfill:
      ALTER TABLE "${statement.table}" ALTER COLUMN "${statement.column}" DROP DEFAULT;

   Or add @default(...) to your Prisma schema before generating the migration,
   then remove it after deploying.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line addNotNullWithoutDefault
`.trim();
};

export const addNotNullWithoutDefaultRule: Rule = {
  name: "addNotNullWithoutDefault",
  severity: "error",
  description:
    "Adding a NOT NULL column without a default value will fail on tables with existing rows",
  detect,
  message,
  suggestion,
};
