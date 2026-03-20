import type { Rule } from "../types";

export const renameColumnRule: Rule = {
  name: "rename_column",
  code: "SM002",
  severity: "error",
  description: "Renaming a column may cause errors in running application",

  detect: (stmt) => stmt.type === "alterTable" && stmt.action === "renameColumn",

  message: (stmt) =>
    `Renaming column "${stmt.column}" on table "${stmt.table}" may cause errors in running application`,

  suggestion: (stmt) =>
    `
❌ Bad: Renaming a column may break application code that references the old column name

✅ Good: Follow these steps:
   1. Add a new column with the new name
   2. Update your application code to use the new column name
   3. Run 'npx prisma generate' to update Prisma Client
   4. Deploy the application code changes
   5. Migrate the data from old column to new column
   6. Then drop the old column '${stmt.column}'

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line rename_column
`.trim(),
};
