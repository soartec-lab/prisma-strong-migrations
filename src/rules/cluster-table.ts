import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "clusterTable";
};

const message = (statement: ParsedStatement): string => {
  return statement.table
    ? `CLUSTER on "${statement.table}" physically rewrites the table and acquires an AccessExclusiveLock`
    : "CLUSTER physically rewrites the table and acquires an AccessExclusiveLock";
};

const suggestion = (statement: ParsedStatement): string => {
  const table = statement.table ?? "table_name";
  return `
❌ Bad: CLUSTER "${table}" physically rewrites the table in index order,
   acquiring an AccessExclusiveLock for the entire duration

✅ Good: Consider these alternatives:
   - pg_repack: reorders the table without a full table lock
   - VACUUM: reclaims dead tuples without a full rewrite
   - Run CLUSTER during a low-traffic maintenance window if necessary

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line clusterTable
`.trim();
};

export const clusterTableRule: Rule = {
  name: "clusterTable",
  severity: "warning",
  description: "CLUSTER physically rewrites the table and acquires an AccessExclusiveLock",
  detect,
  message,
  suggestion,
};
