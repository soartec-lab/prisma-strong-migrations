import type { Rule } from "../types";

export const removeIndexRule: Rule = {
  name: "remove_index",
  code: "SM006",
  severity: "error",
  description: "Dropping an index without CONCURRENTLY locks the table",

  detect: (stmt) => stmt.type === "dropIndex" && stmt.concurrently === false,

  message: (stmt) => `Dropping index "${stmt.indexName}" without CONCURRENTLY locks the table`,

  suggestion: (_stmt) =>
    `
❌ Bad: Dropping an index without CONCURRENTLY acquires a lock that prevents reads and writes

✅ Good: Use DROP INDEX CONCURRENTLY to avoid table lock:
   DROP INDEX CONCURRENTLY "index_name";

Note: CONCURRENTLY cannot be used inside a transaction block.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line remove_index
`.trim(),
};
