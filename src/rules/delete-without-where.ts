import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "deleteStatement" && statement.hasWhere === false;
};

const message = (statement: ParsedStatement): string => {
  return statement.table
    ? `DELETE FROM "${statement.table}" without WHERE clause will delete all rows`
    : "DELETE FROM without WHERE clause will delete all rows";
};

const suggestion = (statement: ParsedStatement): string => {
  const table = statement.table ?? "table_name";
  return `
⚠️  Warning: DELETE FROM without WHERE in a migration will delete every row in the table.

✅ Good: Add a WHERE clause to limit the deleted rows:
   DELETE FROM "${table}" WHERE "condition" = true;

   If you intentionally want to delete all rows, consider:
   DELETE FROM "${table}" WHERE 1=1; -- intentional full delete
   Or use TRUNCATE TABLE if appropriate (though that has its own risks).

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line deleteWithoutWhere
`.trim();
};

export const deleteWithoutWhereRule: Rule = {
  name: "deleteWithoutWhere",
  severity: "warning",
  description: "DELETE FROM without WHERE clause will delete all rows",
  detect,
  message,
  suggestion,
};
