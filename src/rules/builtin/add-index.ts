import type { Rule } from "../types";

export const addIndexRule: Rule = {
  name: "add_index",
  code: "005",
  severity: "error",
  description: "Adding an index without CONCURRENTLY locks the table",

  detect: (stmt) => stmt.type === "createIndex" && stmt.concurrently === false,

  message: (stmt) => `Adding index "${stmt.indexName}" without CONCURRENTLY locks the table`,

  suggestion: (_stmt) =>
    `
❌ Bad: Creating an index without CONCURRENTLY acquires a lock that prevents reads and writes

✅ Good: Use CREATE INDEX CONCURRENTLY to avoid table lock:
   CREATE INDEX CONCURRENTLY "index_name" ON "table_name"("column_name");

Note: CONCURRENTLY cannot be used inside a transaction block.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_index
`.trim(),
};
