import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, context: CheckContext): boolean => {
  if (statement.type !== "disableTransaction") return false;
  const sqlStatements = context.statements.filter((s) => s.type !== "disableTransaction");
  return sqlStatements.length > 1;
};

const message = (_statement: ParsedStatement): string => {
  return "Multiple statements in a migration with disabled transaction — no rollback protection";
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
❌ Bad: When -- prisma-migrate-disable-next-transaction is present, the entire migration
   runs without a transaction. If any statement fails, previous statements cannot be rolled back.

✅ Good: Keep files with -- prisma-migrate-disable-next-transaction to ONE statement only:
   -- prisma-migrate-disable-next-transaction
   CREATE INDEX CONCURRENTLY "index_name" ON "table_name"("column_name");

   Move other DDL statements to a separate migration file.

To skip this check, add above the comment:
   -- prisma-strong-migrations-disable-next-line mixedStatementsWithDisabledTransaction
`.trim();
};

export const mixedStatementsWithDisabledTransactionRule: Rule = {
  name: "mixedStatementsWithDisabledTransaction",
  severity: "error",
  description:
    "Multiple statements in a migration with disabled transaction have no rollback protection",
  detect,
  message,
  suggestion,
};
