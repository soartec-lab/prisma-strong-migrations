import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "createTable" && statement.hasSerialId === true;
};

const message = (statement: ParsedStatement): string => {
  const table = statement.table ? `"${statement.table}"` : "table";
  return `${table}.id uses SERIAL (32-bit integer), which has a maximum of ~2.1 billion rows`;
};

const suggestion = (statement: ParsedStatement): string => {
  const table = statement.table ?? "YourModel";
  return `
⚠️  Warning: SERIAL is a 32-bit integer with a maximum value of 2,147,483,647.
   Large-scale services can exhaust this limit. Migrating from Int to BigInt later
   requires a full table rewrite and cascading changes to all foreign key columns —
   making it nearly impossible in production.

✅ Good: Use BigInt from the start in schema.prisma:
   model ${table} {
   -  id Int    @id @default(autoincrement())
   +  id BigInt @id @default(autoincrement())
   }

   Or use UUID v7 for globally unique, time-sortable IDs:
   model ${table} {
     id String @id @default(uuid(7))
   }

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line intPrimaryKey
`.trim();
};

export const intPrimaryKeyRule: Rule = {
  name: "intPrimaryKey",
  severity: "warning",
  description:
    "Using SERIAL (32-bit) for a primary key risks exhausting the limit on large-scale services",
  detect,
  message,
  suggestion,
};
