import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, FixResult, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return (
    statement.type === "alterTable" &&
    statement.action === "addConstraint" &&
    statement.constraintType === "unique"
  );
};

const message = (statement: ParsedStatement): string => {
  return `Adding unique constraint "${statement.constraintName}" locks the table`;
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
❌ Bad: Adding a unique constraint directly acquires a lock that prevents reads and writes

✅ Good: Follow these steps:
   1. Create a unique index concurrently:
      CREATE UNIQUE INDEX CONCURRENTLY "index_name" ON "table_name"("column_name");
   2. Add the constraint using the existing index:
      ALTER TABLE "table_name" ADD CONSTRAINT "constraint_name"
        UNIQUE USING INDEX "index_name";

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line addUniqueConstraint
`.trim();
};

const fix = (statement: ParsedStatement): FixResult => {
  const indexName = `${statement.constraintName}_idx`;
  // Extract column list from: ADD CONSTRAINT "name" UNIQUE ("col1", "col2")
  const columnsMatch = statement.raw.match(/UNIQUE\s*\(([^)]+)\)/i);
  const columns = columnsMatch ? columnsMatch[1].trim() : "";
  return {
    statements: [
      `CREATE UNIQUE INDEX CONCURRENTLY "${indexName}" ON "${statement.table}"(${columns})`,
      `ALTER TABLE "${statement.table}" ADD CONSTRAINT "${statement.constraintName}" UNIQUE USING INDEX "${indexName}"`,
    ],
    requiresDisableTransaction: true,
  };
};

export const addUniqueConstraintRule: Rule = {
  name: "addUniqueConstraint",
  severity: "error",
  description: "Adding a unique constraint locks the table",
  detect,
  message,
  suggestion,
  fix,
};
