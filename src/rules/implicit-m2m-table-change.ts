import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const IMPLICIT_M2M_PATTERN = /^_[A-Z][a-zA-Z]*To[A-Z][a-zA-Z]*$/;

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  if (!statement.table || !IMPLICIT_M2M_PATTERN.test(statement.table)) return false;
  return (
    statement.type === "alterTable" ||
    statement.type === "dropTable" ||
    statement.type === "createIndex"
  );
};

const message = (statement: ParsedStatement): string => {
  const table = statement.table ? `"${statement.table}"` : "this table";
  return `${table} is a Prisma-managed implicit M2M table — direct modification may break Prisma's relation management`;
};

const suggestion = (statement: ParsedStatement): string => {
  const table = statement.table ?? "_CategoryToPost";
  return `
❌ Bad: Directly modifying "${table}" bypasses Prisma's implicit M2M management.
   Prisma auto-generates and manages this join table. Manual changes can cause
   Prisma Client queries to fail or produce incorrect results.

✅ Good: Modify the relation in schema.prisma and let Prisma regenerate the migration:
   - To add fields to the join table, convert to an explicit M2M relation:
     model CategoryToPost {
       post       Post     @relation(fields: [postId], references: [id])
       postId     Int
       category   Category @relation(fields: [categoryId], references: [id])
       categoryId Int
       @@id([postId, categoryId])
     }
   - Then run: npx prisma migrate dev

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line implicitM2mTableChange
`.trim();
};

export const implicitM2mTableChangeRule: Rule = {
  name: "implicitM2mTableChange",
  severity: "error",
  description:
    "Directly modifying a Prisma-managed implicit M2M table may break Prisma's relation management",
  detect,
  message,
  suggestion,
};
