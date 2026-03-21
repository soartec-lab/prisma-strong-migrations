import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "alterType";
};

const message = (statement: ParsedStatement): string => {
  const typeName = statement.typeName ? `"${statement.typeName}"` : "enum type";
  return `Removing values from ${typeName} may fail if existing data uses the removed value`;
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
❌ Bad: Removing an ENUM value recreates the type. If existing rows contain the removed value,
   the migration will fail. If Prisma Client is deployed before the migration, it will throw
   runtime errors referencing a value that no longer exists.

✅ Safe approach:
   1. Remove all references to the enum value from your application code
   2. Deploy the code changes
   3. Backfill existing data: UPDATE "table" SET "col" = 'OTHER_VALUE' WHERE "col" = 'REMOVED_VALUE'
   4. Apply this migration
   5. Run npx prisma generate and deploy the updated Prisma Client

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line enumValueRemoval
`.trim();
};

export const enumValueRemovalRule: Rule = {
  name: "enumValueRemoval",
  severity: "error",
  description:
    "Removing an ENUM value recreates the type and will fail if existing data uses the removed value",
  detect,
  message,
  suggestion,
};
