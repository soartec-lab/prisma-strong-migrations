import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, context: CheckContext): boolean => {
  if (statement.type !== "validateConstraint") return false;
  return context.statements.some((s) => s.type === "alterTable" && s.notValid === true);
};

const message = (_statement: ParsedStatement): string => {
  return "VALIDATE CONSTRAINT in the same file as NOT VALID negates the lock optimization";
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
❌ Bad: Adding NOT VALID and VALIDATE CONSTRAINT in the same migration file negates the benefit.
   Both run in the same transaction, so the full table scan and lock still occur.

✅ Good: Split into two separate migration files:
   migration_1.sql:
     ALTER TABLE "table" ADD CONSTRAINT "fk" FOREIGN KEY ("col") REFERENCES "other"("id") NOT VALID;

   migration_2.sql (run after deploying migration_1):
     ALTER TABLE "table" VALIDATE CONSTRAINT "fk";

   This way VALIDATE CONSTRAINT uses a ShareUpdateExclusiveLock that allows reads and writes.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line notValidValidateSameFile
`.trim();
};

export const notValidValidateSameFileRule: Rule = {
  name: "notValidValidateSameFile",
  severity: "error",
  description: "VALIDATE CONSTRAINT in the same file as NOT VALID negates the lock optimization",
  detect,
  message,
  suggestion,
};
