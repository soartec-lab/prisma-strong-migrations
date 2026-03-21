import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "createTableAsSelect";
};

const message = (statement: ParsedStatement): string => {
  return statement.table
    ? `CREATE TABLE "${statement.table}" AS SELECT may take a long time on large tables and block concurrent operations`
    : "CREATE TABLE AS SELECT may take a long time on large tables and block concurrent operations";
};

const suggestion = (statement: ParsedStatement): string => {
  const table = statement.table ?? "backup_table";
  return `
❌ Bad: CREATE TABLE "${table}" AS SELECT copies data inside the migration,
   which can take a very long time on large tables

✅ Good: Run backups outside the migration:
   - Use pg_dump for point-in-time backups
   - Use application-level copy jobs during low-traffic periods
   - If you need the table for a migration step, create it empty first,
     then backfill in a separate non-migration process

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line createTableAsSelect
`.trim();
};

export const createTableAsSelectRule: Rule = {
  name: "createTableAsSelect",
  severity: "warning",
  description: "CREATE TABLE AS SELECT may take a long time on large tables",
  detect,
  message,
  suggestion,
};
