import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "../types";

const VOLATILE_FUNCTION_PATTERN =
  /\b(gen_random_uuid|now|random|clock_timestamp|timeofday|transaction_timestamp|statement_timestamp)\s*\(/i;

function detect(statement: ParsedStatement, _context: CheckContext): boolean {
  if (statement.type !== "alterTable" || statement.action !== "addColumn") return false;
  return VOLATILE_FUNCTION_PATTERN.test(statement.raw);
}

function message(statement: ParsedStatement): string {
  return `Adding column "${statement.column}" with a volatile default value may cause issues`;
}

function suggestion(_statement: ParsedStatement): string {
  return `
❌ Bad: Adding a column with a volatile default (e.g., gen_random_uuid(), now()) rewrites the
   entire table and locks it in older PostgreSQL versions

✅ Good: Follow these steps:
   1. Add the column without a default value:
      ALTER TABLE "table_name" ADD COLUMN "column_name" type;
   2. Backfill existing rows with application logic or a separate UPDATE statement
   3. Add the default value in a separate migration if needed:
      ALTER TABLE "table_name" ALTER COLUMN "column_name" SET DEFAULT volatile_function();

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_volatile_default
`.trim();
}

export const addVolatileDefaultRule: Rule = {
  name: "add_volatile_default",
  severity: "error",
  description: "Adding a column with a volatile default value may cause issues",
  detect,
  message,
  suggestion,
};
