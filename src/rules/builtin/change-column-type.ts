import type { Rule } from "../types";

export const changeColumnTypeRule: Rule = {
  name: "change_column_type",
  code: "004",
  severity: "error",
  description: "Changing a column type may cause application errors",

  detect: (stmt) => stmt.type === "alterTable" && stmt.action === "alterColumnType",

  message: (stmt) =>
    `Changing type of column "${stmt.column}" on table "${stmt.table}" may cause application errors`,

  suggestion: (stmt) =>
    `
❌ Bad: Changing a column type may cause errors if the application reads the column with the old type

✅ Good: Follow these steps:
   1. Add a new column with the desired type
   2. Migrate the data from '${stmt.column}' to the new column
   3. Update your application code to use the new column
   4. Run 'npx prisma generate' to update Prisma Client
   5. Deploy the application code changes
   6. Then drop the old column

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line change_column_type
`.trim(),
};
