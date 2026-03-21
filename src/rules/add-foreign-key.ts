import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, FixResult, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return (
    statement.type === "alterTable" &&
    statement.action === "addConstraint" &&
    statement.constraintType === "foreignKey" &&
    statement.notValid !== true
  );
};

const message = (statement: ParsedStatement): string => {
  return `Adding foreign key "${statement.constraintName}" without NOT VALID locks the table`;
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
❌ Bad: Adding a foreign key without NOT VALID validates all existing rows and locks the table

✅ Good: Follow these steps:
   1. Add the constraint with NOT VALID to skip validation of existing rows:
      ALTER TABLE "table_name" ADD CONSTRAINT "constraint_name"
        FOREIGN KEY ("column") REFERENCES "other_table"("id") NOT VALID;
   2. In a separate transaction, validate the constraint:
      ALTER TABLE "table_name" VALIDATE CONSTRAINT "constraint_name";

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line addForeignKey
`.trim();
};

const fix = (statement: ParsedStatement): FixResult => {
  const rawWithoutSemi = statement.raw.replace(/;\s*$/, "");
  return {
    statements: [
      `${rawWithoutSemi} NOT VALID`,
      `ALTER TABLE "${statement.table}" VALIDATE CONSTRAINT "${statement.constraintName}"`,
    ],
  };
};

export const addForeignKeyRule: Rule = {
  name: "addForeignKey",
  severity: "error",
  description: "Adding a foreign key without NOT VALID locks the table",
  detect,
  message,
  suggestion,
  fix,
};
