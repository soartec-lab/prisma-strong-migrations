import type { Rule } from "../types";

export const addVolatileDefaultRule: Rule = {
  name: "add_volatile_default",
  code: "013",
  severity: "error",
  description: "Adding a column with a volatile default value may cause issues",

  detect: (stmt) => {
    if (stmt.type !== "alterTable" || stmt.action !== "addColumn") return false;
    const volatilePattern =
      /\b(gen_random_uuid|now|random|clock_timestamp|timeofday|transaction_timestamp|statement_timestamp)\s*\(/i;
    return volatilePattern.test(stmt.raw);
  },

  message: (stmt) =>
    `Adding column "${stmt.column}" with a volatile default value may cause issues`,

  suggestion: (_stmt) =>
    `
❌ Bad: Adding a column with a volatile default (e.g., gen_random_uuid(), now()) rewrites the
   entire table and locks it in older PostgreSQL versions

✅ Good: Follow these steps:
   1. Add the column without a default value:
      ALTER TABLE "table_name" ADD COLUMN "column_name" type;
   2. Backfill existing rows with application logic or a separate UPDATE statement
   3. Add the default value in a separate migration if needed:
      ALTER TABLE "table_name" ALTER COLUMN "column_name" SET DEFAULT volatile_function();

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_volatile_default
`.trim(),
};
