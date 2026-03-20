import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "../types";

function detect(statement: ParsedStatement, _context: CheckContext): boolean {
  if (statement.type !== "alterTable" || statement.action !== "addColumn") return false;
  const upperRaw = statement.raw.toUpperCase();
  return upperRaw.includes("GENERATED ALWAYS AS") && upperRaw.includes("STORED");
}

function message(statement: ParsedStatement): string {
  return `Adding stored generated column "${statement.column}" locks the table`;
}

function suggestion(_statement: ParsedStatement): string {
  return `
❌ Bad: Adding a stored generated column rewrites the entire table to compute the generated values

✅ Good: Follow these steps:
   1. Add the column without STORED generation:
      ALTER TABLE "table_name" ADD COLUMN "column_name" type;
   2. Backfill the data in a separate step:
      UPDATE "table_name" SET "column_name" = <expression>;
   3. Consider using a virtual/computed column approach at the application level instead

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_stored_generated
`.trim();
}

export const addStoredGeneratedRule: Rule = {
  name: "add_stored_generated",
  severity: "error",
  description: "Adding a stored generated column locks the table",
  detect,
  message,
  suggestion,
};
