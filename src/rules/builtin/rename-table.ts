import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "../types";

function detect(statement: ParsedStatement, _context: CheckContext): boolean {
  return statement.type === "alterTable" && statement.action === "renameTable";
}

function message(statement: ParsedStatement): string {
  return `Renaming table "${statement.table}" may cause errors in running application`;
}

function suggestion(statement: ParsedStatement): string {
  return `
❌ Bad: Renaming a table may break application code that references the old table name

✅ Good: Follow these steps:
   1. Create a new table with the new name
   2. Update your application code to reference the new table name
   3. Run 'npx prisma generate' to update Prisma Client
   4. Deploy the application code changes
   5. Migrate the data from old table '${statement.table}' to new table
   6. Then drop the old table

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line rename_table
`.trim();
}

export const renameTableRule: Rule = {
  name: "rename_table",
  severity: "error",
  description: "Renaming a table may cause errors in running application",
  detect,
  message,
  suggestion,
};
