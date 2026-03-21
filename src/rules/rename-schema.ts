import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "alterSchema";
};

const message = (_statement: ParsedStatement): string => {
  return `Renaming schema may cause errors in running application`;
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
❌ Bad: Renaming a schema may break application code that references the old schema name

✅ Good: Follow these steps:
   1. Update all schema references in your application code
   2. Update connection strings and ORM configurations
   3. Run 'npx prisma generate' to update Prisma Client
   4. Deploy the application code changes
   5. Then rename the schema

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line renameSchema
`.trim();
};

export const renameSchemaRule: Rule = {
  name: "renameSchema",
  severity: "error",
  description: "Renaming a schema may cause errors in running application",
  detect,
  message,
  suggestion,
};
