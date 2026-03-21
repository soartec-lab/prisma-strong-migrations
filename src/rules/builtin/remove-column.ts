import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "../types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "alterTable" && statement.action === "dropColumn";
};

const message = (statement: ParsedStatement): string => {
  return `Removing column "${statement.column}" from table "${statement.table}" may cause errors in running application`;
};

const suggestion = (statement: ParsedStatement): string => {
  return `
❌ Bad: Removing a column immediately can cause errors if the application still references it

✅ Good: Follow these steps:
   1. Remove all usages of '${statement.column}' field from your application code
   2. Run 'npx prisma generate' to update Prisma Client
   3. Deploy the application code changes
   4. Then apply this migration

📚 More info: https://github.com/prisma/prisma/issues/16821

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line removeColumn
`.trim();
};

export const removeColumnRule: Rule = {
  name: "removeColumn",
  severity: "error",
  description: "Removing a column may cause application errors",
  detect,
  message,
  suggestion,
};
