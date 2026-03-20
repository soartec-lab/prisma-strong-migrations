import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "../types";

function detect(statement: ParsedStatement, _context: CheckContext): boolean {
  return (
    statement.type === "alterTable" &&
    statement.action === "addColumn" &&
    statement.dataType?.toLowerCase() === "json"
  );
}

function message(statement: ParsedStatement): string {
  return `Adding column "${statement.column}" with type json is not recommended. Use jsonb instead`;
}

function suggestion(_statement: ParsedStatement): string {
  return `
❌ Bad: The json type stores an exact copy of the input text which must be reparsed on every query

✅ Good: Use jsonb instead:
   - jsonb stores data in a decomposed binary format
   - jsonb is more efficient for processing and supports indexing
   - jsonb supports all JSON operators and functions

Replace json with jsonb in your migration.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_json_column
`.trim();
}

export const addJsonColumnRule: Rule = {
  name: "add_json_column",
  severity: "error",
  description: "Adding a json column is not recommended; use jsonb instead",
  detect,
  message,
  suggestion,
};
