import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "../types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "dropTable";
};

const message = (statement: ParsedStatement): string => {
  return `Dropping table "${statement.table}" will permanently delete all data`;
};

const suggestion = (statement: ParsedStatement): string => {
  return `
❌ Bad: Dropping a table immediately can cause errors if the application still references it,
   and permanently deletes all data

✅ Good: Follow these steps:
   1. Remove all references to "${statement.table}" from your application code
   2. Run 'npx prisma generate' to update Prisma Client
   3. Deploy the application code changes
   4. Then apply this migration

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line drop_table
`.trim();
};

export const dropTableRule: Rule = {
  name: "drop_table",
  severity: "error",
  description: "Dropping a table will permanently delete all data and may cause application errors",
  detect,
  message,
  suggestion,
};
