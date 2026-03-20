import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "../types";

function detect(statement: ParsedStatement, _context: CheckContext): boolean {
  return (
    statement.type === "alterTable" &&
    statement.action === "addConstraint" &&
    statement.constraintType === "check" &&
    statement.notValid !== true
  );
}

function message(statement: ParsedStatement): string {
  return `Adding check constraint "${statement.constraintName}" without NOT VALID locks the table`;
}

function suggestion(_statement: ParsedStatement): string {
  return `
❌ Bad: Adding a check constraint without NOT VALID validates all existing rows and locks the table

✅ Good: Follow these steps:
   1. Add the constraint with NOT VALID to skip validation of existing rows:
      ALTER TABLE "table_name" ADD CONSTRAINT "constraint_name"
        CHECK (condition) NOT VALID;
   2. In a separate transaction, validate the constraint:
      ALTER TABLE "table_name" VALIDATE CONSTRAINT "constraint_name";

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_check_constraint
`.trim();
}

export const addCheckConstraintRule: Rule = {
  name: "add_check_constraint",
  severity: "error",
  description: "Adding a check constraint without NOT VALID locks the table",
  detect,
  message,
  suggestion,
};
