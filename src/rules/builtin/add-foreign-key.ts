import type { Rule } from "../types";

export const addForeignKeyRule: Rule = {
  name: "add_foreign_key",
  code: "007",
  severity: "error",
  description: "Adding a foreign key without NOT VALID locks the table",

  detect: (stmt) =>
    stmt.type === "alterTable" &&
    stmt.action === "addConstraint" &&
    stmt.constraintType === "foreignKey" &&
    stmt.notValid !== true,

  message: (stmt) =>
    `Adding foreign key "${stmt.constraintName}" without NOT VALID locks the table`,

  suggestion: (_stmt) =>
    `
❌ Bad: Adding a foreign key without NOT VALID validates all existing rows and locks the table

✅ Good: Follow these steps:
   1. Add the constraint with NOT VALID to skip validation of existing rows:
      ALTER TABLE "table_name" ADD CONSTRAINT "constraint_name"
        FOREIGN KEY ("column") REFERENCES "other_table"("id") NOT VALID;
   2. In a separate transaction, validate the constraint:
      ALTER TABLE "table_name" VALIDATE CONSTRAINT "constraint_name";

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_foreign_key
`.trim(),
};
