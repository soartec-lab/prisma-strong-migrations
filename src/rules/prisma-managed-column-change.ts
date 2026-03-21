import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const UPDATED_AT_COLUMNS = ["updatedAt", "updated_at"];

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  if (
    statement.type === "alterTable" &&
    statement.action === "alterColumnSetDefault" &&
    statement.column !== undefined &&
    UPDATED_AT_COLUMNS.includes(statement.column)
  ) {
    return true;
  }

  if (statement.type === "createTrigger") {
    const raw = statement.raw.toLowerCase();
    return UPDATED_AT_COLUMNS.some((col) => raw.includes(col.toLowerCase()));
  }

  return false;
};

const message = (statement: ParsedStatement): string => {
  if (statement.type === "createTrigger") {
    const table = statement.table ? `on "${statement.table}"` : "";
    return `CREATE TRIGGER ${table} conflicts with Prisma's @updatedAt automatic update`;
  }
  const table = statement.table ? `"${statement.table}".` : "";
  return `Setting a DB-level default on ${table}"${statement.column}" conflicts with Prisma's @updatedAt management`;
};

const suggestion = (statement: ParsedStatement): string => {
  return `
❌ Bad: Prisma's @updatedAt annotation automatically sets the column value on every update
   via the Prisma Client. Adding a DB-level DEFAULT or TRIGGER for the same column creates
   a conflict — both Prisma and the database will try to manage the value, leading to
   unexpected behavior or duplicate writes.

✅ Good: Let Prisma manage @updatedAt exclusively:
   - Remove the DB-level DEFAULT or TRIGGER
   - Use @updatedAt in schema.prisma:
     model ${statement.table ?? "YourModel"} {
       updatedAt DateTime @updatedAt
     }

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line prismaManagedColumnChange
`.trim();
};

export const prismaManagedColumnChangeRule: Rule = {
  name: "prismaManagedColumnChange",
  severity: "warning",
  description:
    "Modifying a Prisma-managed column (e.g. @updatedAt) at the DB level conflicts with Prisma Client",
  detect,
  message,
  suggestion,
};
