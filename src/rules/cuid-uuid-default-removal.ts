import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const ID_COLUMN_PATTERN = /^id$/i;

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return (
    statement.type === "alterTable" &&
    statement.action === "dropColumnDefault" &&
    statement.column !== undefined &&
    ID_COLUMN_PATTERN.test(statement.column)
  );
};

const message = (statement: ParsedStatement): string => {
  const table = statement.table ? `"${statement.table}"` : "table";
  return `Dropping the default from ${table}."id" may break Prisma's ID generation`;
};

const suggestion = (statement: ParsedStatement): string => {
  const table = statement.table ?? "YourModel";
  return `
❌ Bad: Prisma generates cuid() and uuid() values in the application layer, not the database.
   Dropping the DEFAULT from the "id" column can break ID generation if the column relies
   on a database-level default (e.g. gen_random_uuid(), uuid_generate_v4()).

✅ Good: If you need to change ID generation strategy, update schema.prisma instead:
   model ${table} {
     id String @id @default(uuid(7))  // or cuid(), or uuid()
   }
   Then run: npx prisma migrate dev

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line cuidUuidDefaultRemoval
`.trim();
};

export const cuidUuidDefaultRemovalRule: Rule = {
  name: "cuidUuidDefaultRemoval",
  severity: "error",
  description: "Dropping the default from an id column may break Prisma's ID generation",
  detect,
  message,
  suggestion,
};
