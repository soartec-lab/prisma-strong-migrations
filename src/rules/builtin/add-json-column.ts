import type { Rule } from "../types";

export const addJsonColumnRule: Rule = {
  name: "add_json_column",
  code: "SM012",
  severity: "error",
  description: "Adding a json column is not recommended; use jsonb instead",

  detect: (stmt) =>
    stmt.type === "alterTable" &&
    stmt.action === "addColumn" &&
    stmt.dataType?.toLowerCase() === "json",

  message: (stmt) =>
    `Adding column "${stmt.column}" with type json is not recommended. Use jsonb instead`,

  suggestion: (_stmt) =>
    `
❌ Bad: The json type stores an exact copy of the input text which must be reparsed on every query

✅ Good: Use jsonb instead:
   - jsonb stores data in a decomposed binary format
   - jsonb is more efficient for processing and supports indexing
   - jsonb supports all JSON operators and functions

Replace json with jsonb in your migration.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_json_column
`.trim(),
};
