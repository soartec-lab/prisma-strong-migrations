import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "alterTable" && statement.action === "alterColumnType";
};

const message = (statement: ParsedStatement): string => {
  return `Changing type of column "${statement.column}" on table "${statement.table}" may cause application errors`;
};

const suggestion = (statement: ParsedStatement): string => {
  return `
❌ Bad: Changing a column type may cause errors if the application reads the column with the old type

✅ Good: Follow these steps:
   1. Add a new column with the desired type
   2. Migrate the data from '${statement.column}' to the new column
   3. Update your application code to use the new column
   4. Run 'npx prisma generate' to update Prisma Client
   5. Deploy the application code changes
   6. Then drop the old column

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line changeColumnType
`.trim();
};

export const changeColumnTypeRule: Rule = {
  name: "changeColumnType",
  severity: "error",
  description: "Changing a column type may cause application errors",
  detect,
  message,
  suggestion,
};
