import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "updateStatement" && statement.hasWhere === false;
};

const message = (statement: ParsedStatement): string => {
  return statement.table
    ? `UPDATE "${statement.table}" without WHERE clause will affect all rows`
    : "UPDATE without WHERE clause will affect all rows";
};

const suggestion = (statement: ParsedStatement): string => {
  const table = statement.table ?? "table_name";
  return `
⚠️  Warning: UPDATE without WHERE in a migration will update every row in the table.
   In production, this can lock the table and take a long time on large datasets.

✅ Good: Add a WHERE clause to limit the affected rows:
   UPDATE "${table}" SET "column" = value WHERE "condition" = true;

   If you intentionally want to update all rows, make it explicit:
   UPDATE "${table}" SET "column" = value WHERE 1=1; -- intentional full update

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line updateWithoutWhere
`.trim();
};

export const updateWithoutWhereRule: Rule = {
  name: "updateWithoutWhere",
  severity: "warning",
  description: "UPDATE without WHERE clause will affect all rows",
  detect,
  message,
  suggestion,
};
