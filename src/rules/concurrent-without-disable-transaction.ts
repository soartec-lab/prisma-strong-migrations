import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, context: CheckContext): boolean => {
  const isConcurrent =
    (statement.type === "createIndex" || statement.type === "dropIndex") &&
    statement.concurrently === true;
  if (!isConcurrent) return false;
  const hasDisableTransaction = context.statements.some(
    (s) => s.type === "disableTransaction",
  );
  return !hasDisableTransaction;
};

const message = (statement: ParsedStatement): string => {
  const op = statement.type === "createIndex" ? "CREATE" : "DROP";
  return `${op} INDEX CONCURRENTLY cannot run inside a transaction — add -- prisma-migrate-disable-next-transaction`;
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
❌ Bad: CONCURRENTLY cannot run inside a transaction block (Prisma wraps migrations in transactions)

✅ Good: Add -- prisma-migrate-disable-next-transaction as the FIRST LINE of the file:
   -- prisma-migrate-disable-next-transaction
   CREATE INDEX CONCURRENTLY "index_name" ON "table_name"("column_name");

⚠️  Note: Keep this file minimal — ideally one statement only.
   Disabling the transaction removes rollback protection for the entire file.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line concurrentWithoutDisableTransaction
`.trim();
};

export const concurrentWithoutDisableTransactionRule: Rule = {
  name: "concurrentWithoutDisableTransaction",
  severity: "error",
  description:
    "CONCURRENTLY cannot run inside a transaction — prisma-migrate-disable-next-transaction is required",
  detect,
  message,
  suggestion,
};
