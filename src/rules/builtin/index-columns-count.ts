import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "../types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return (
    statement.type === "createIndex" &&
    statement.unique !== true &&
    (statement.columns?.length ?? 0) >= 4
  );
};

const message = (statement: ParsedStatement): string => {
  return `Index "${statement.indexName}" has ${statement.columns?.length ?? 0} columns which may impact write performance`;
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
⚠️  Warning: Indexes with many columns increase write overhead and storage usage

✅ Good: Consider these alternatives:
   1. Reduce the number of indexed columns to those most commonly used in queries
   2. Split into separate indexes for different query patterns
   3. Use partial indexes to index only a subset of rows

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line indexColumnsCount
`.trim();
};

export const indexColumnsCountRule: Rule = {
  name: "indexColumnsCount",
  severity: "warning",
  description: "Index with too many columns may impact write performance",
  detect,
  message,
  suggestion,
};
