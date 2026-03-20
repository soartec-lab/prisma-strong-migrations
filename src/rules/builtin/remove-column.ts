import type { Rule } from "../types";

export const removeColumnRule: Rule = {
  name: "remove_column",
  code: "SM001",
  severity: "error",
  description: "Removing a column may cause application errors",

  detect: (stmt) => stmt.type === "alterTable" && stmt.action === "dropColumn",

  message: (stmt) =>
    `Removing column "${stmt.column}" from table "${stmt.table}" may cause errors in running application`,

  suggestion: (stmt) =>
    `
❌ Bad: Removing a column immediately can cause errors if the application still references it

✅ Good: Follow these steps:
   1. Remove all usages of '${stmt.column}' field from your application code
   2. Run 'npx prisma generate' to update Prisma Client
   3. Deploy the application code changes
   4. Then apply this migration

📚 More info: https://github.com/prisma/prisma/issues/16821

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line remove_column
`.trim(),
};
