import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "disableTransaction";
};

const message = (_statement: ParsedStatement): string => {
  return "This migration runs without transaction protection";
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
⚠️  Warning: -- prisma-migrate-disable-next-transaction disables the transaction
   for the ENTIRE migration file. If any statement fails, the database
   may be left in a partial state with no automatic rollback.

✅ Good: Keep this file minimal — ideally one statement only.

❌ Bad: Mixing other DDL statements in the same file increases the risk
   of leaving the database in a partial state if a failure occurs.

To skip this check, add above the comment:
   -- prisma-strong-migrations-disable-next-line disableTransactionWarning
`.trim();
};

export const disableTransactionWarningRule: Rule = {
  name: "disableTransactionWarning",
  severity: "warning",
  description:
    "Migrations without transaction protection may leave the database in a partial state on failure",
  detect,
  message,
  suggestion,
};
