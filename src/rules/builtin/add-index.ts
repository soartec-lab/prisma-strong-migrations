import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "../types";

function detect(statement: ParsedStatement, _context: CheckContext): boolean {
  return statement.type === "createIndex" && statement.concurrently === false;
}

function message(statement: ParsedStatement): string {
  return `Adding index "${statement.indexName}" without CONCURRENTLY locks the table`;
}

function suggestion(_statement: ParsedStatement): string {
  return `
❌ Bad: Creating an index without CONCURRENTLY acquires a lock that prevents reads and writes

✅ Good: Use CREATE INDEX CONCURRENTLY to avoid table lock:
   CREATE INDEX CONCURRENTLY "index_name" ON "table_name"("column_name");

Note: CONCURRENTLY cannot be used inside a transaction block.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_index
`.trim();
}

export const addIndexRule: Rule = {
  name: "add_index",
  severity: "error",
  description: "Adding an index without CONCURRENTLY locks the table",
  detect,
  message,
  suggestion,
};
