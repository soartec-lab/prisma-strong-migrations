import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "truncateTable";
};

const message = (statement: ParsedStatement): string => {
  return statement.table
    ? `TRUNCATE TABLE "${statement.table}" will delete all rows and acquire an AccessExclusiveLock`
    : "TRUNCATE will delete all rows and acquire an AccessExclusiveLock";
};

const suggestion = (statement: ParsedStatement): string => {
  const table = statement.table ?? "table_name";
  return `
❌ Bad: TRUNCATE acquires an AccessExclusiveLock and deletes all rows — fatal if run in production by mistake

✅ Good: Delete rows in application code instead:
   await prisma.${table}.deleteMany({});
   Or limit to development environments only.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line truncateTable
`.trim();
};

export const truncateTableRule: Rule = {
  name: "truncateTable",
  severity: "error",
  description: "TRUNCATE deletes all rows and acquires an AccessExclusiveLock",
  detect,
  message,
  suggestion,
};
