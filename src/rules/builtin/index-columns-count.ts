import type { Rule } from "../types";

export const indexColumnsCountRule: Rule = {
  name: "index_columns_count",
  code: "101",
  severity: "warning",
  description: "Index with too many columns may impact write performance",

  detect: (stmt) =>
    stmt.type === "createIndex" && stmt.unique !== true && (stmt.columns?.length ?? 0) >= 4,

  message: (stmt) =>
    `Index "${stmt.indexName}" has ${stmt.columns?.length ?? 0} columns which may impact write performance`,

  suggestion: (_stmt) =>
    `
⚠️  Warning: Indexes with many columns increase write overhead and storage usage

✅ Good: Consider these alternatives:
   1. Reduce the number of indexed columns to those most commonly used in queries
   2. Split into separate indexes for different query patterns
   3. Use partial indexes to index only a subset of rows

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line index_columns_count
`.trim(),
};
