import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "dropIndex" && statement.concurrently === false;
};

const message = (statement: ParsedStatement): string => {
  return `Dropping index "${statement.indexName}" without CONCURRENTLY locks the table`;
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
❌ Bad: Dropping an index without CONCURRENTLY acquires a lock that prevents reads and writes

✅ Good: Use DROP INDEX CONCURRENTLY to avoid table lock:
   DROP INDEX CONCURRENTLY "index_name";

Note: CONCURRENTLY cannot be used inside a transaction block.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line removeIndex
`.trim();
};

export const removeIndexRule: Rule = {
  name: "removeIndex",
  severity: "error",
  description: "Dropping an index without CONCURRENTLY locks the table",
  detect,
  message,
  suggestion,
};
