import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "../types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "alterTable" && statement.action === "renameColumn";
};

const message = (statement: ParsedStatement): string => {
  return `Renaming column "${statement.column}" on table "${statement.table}" may cause errors in running application`;
};

const suggestion = (statement: ParsedStatement): string => {
  return `
❌ Bad: Renaming a column may break application code that references the old column name

✅ Good: Follow these steps:
   1. Add a new column with the new name
   2. Update your application code to use the new column name
   3. Run 'npx prisma generate' to update Prisma Client
   4. Deploy the application code changes
   5. Migrate the data from old column to new column
   6. Then drop the old column '${statement.column}'

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line renameColumn
`.trim();
};

export const renameColumnRule: Rule = {
  name: "renameColumn",
  severity: "error",
  description: "Renaming a column may cause errors in running application",
  detect,
  message,
  suggestion,
};
