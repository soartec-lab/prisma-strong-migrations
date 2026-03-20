import type { Rule } from "../types";

export const addStoredGeneratedRule: Rule = {
  name: "add_stored_generated",
  code: "015",
  severity: "error",
  description: "Adding a stored generated column locks the table",

  detect: (stmt) => {
    if (stmt.type !== "alterTable" || stmt.action !== "addColumn") return false;
    const raw = stmt.raw.toUpperCase();
    return raw.includes("GENERATED ALWAYS AS") && raw.includes("STORED");
  },

  message: (stmt) => `Adding stored generated column "${stmt.column}" locks the table`,

  suggestion: (_stmt) =>
    `
❌ Bad: Adding a stored generated column rewrites the entire table to compute the generated values

✅ Good: Follow these steps:
   1. Add the column without STORED generation:
      ALTER TABLE "table_name" ADD COLUMN "column_name" type;
   2. Backfill the data in a separate step:
      UPDATE "table_name" SET "column_name" = <expression>;
   3. Consider using a virtual/computed column approach at the application level instead

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_stored_generated
`.trim(),
};
