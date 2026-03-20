import type { Rule } from "../types";

export const addCheckConstraintRule: Rule = {
  name: "add_check_constraint",
  code: "SM008",
  severity: "error",
  description: "Adding a check constraint without NOT VALID locks the table",

  detect: (stmt) =>
    stmt.type === "alterTable" &&
    stmt.action === "addConstraint" &&
    stmt.constraintType === "check" &&
    stmt.notValid !== true,

  message: (stmt) =>
    `Adding check constraint "${stmt.constraintName}" without NOT VALID locks the table`,

  suggestion: (_stmt) =>
    `
❌ Bad: Adding a check constraint without NOT VALID validates all existing rows and locks the table

✅ Good: Follow these steps:
   1. Add the constraint with NOT VALID to skip validation of existing rows:
      ALTER TABLE "table_name" ADD CONSTRAINT "constraint_name"
        CHECK (condition) NOT VALID;
   2. In a separate transaction, validate the constraint:
      ALTER TABLE "table_name" VALIDATE CONSTRAINT "constraint_name";

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_check_constraint
`.trim(),
};
