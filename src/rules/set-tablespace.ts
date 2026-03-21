import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "setTablespace";
};

const message = (statement: ParsedStatement): string => {
  return statement.table
    ? `SET TABLESPACE on "${statement.table}" physically moves the table and acquires an AccessExclusiveLock`
    : "SET TABLESPACE physically moves the table and acquires an AccessExclusiveLock";
};

const suggestion = (statement: ParsedStatement): string => {
  const table = statement.table ?? "table_name";
  return `
❌ Bad: SET TABLESPACE physically moves "${table}" to another storage location,
   acquiring an AccessExclusiveLock for the entire duration

✅ Good: Run this operation during a low-traffic maintenance window,
   not as part of a regular migration.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line setTablespace
`.trim();
};

export const setTablespaceRule: Rule = {
  name: "setTablespace",
  severity: "error",
  description: "SET TABLESPACE physically moves the table and acquires an AccessExclusiveLock",
  detect,
  message,
  suggestion,
};
