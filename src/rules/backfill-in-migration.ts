import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, context: CheckContext): boolean => {
  if (statement.type !== "updateStatement") return false;
  return context.statements.some((s) => s.type === "alterTable");
};

const message = (statement: ParsedStatement): string => {
  return statement.table
    ? `UPDATE "${statement.table}" mixed with schema changes — backfill should be in a separate migration`
    : "UPDATE mixed with schema changes — backfill should be in a separate migration";
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
❌ Bad: Mixing schema changes (ALTER TABLE) and data backfill (UPDATE) in the same migration
   can cause long-running locks on large tables.

✅ Good: Split into two separate migration files:
   migration_1.sql: schema change only
     ALTER TABLE "users" ADD COLUMN "full_name" text;

   migration_2.sql: backfill only
     UPDATE "users" SET "full_name" = first_name || ' ' || last_name;

   For large tables, consider doing the backfill in batches from application code instead.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line backfillInMigration
`.trim();
};

export const backfillInMigrationRule: Rule = {
  name: "backfillInMigration",
  severity: "error",
  description: "UPDATE mixed with schema changes should be in a separate migration",
  detect,
  message,
  suggestion,
};
