import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "vacuum";
};

const message = (_statement: ParsedStatement): string => {
  return "VACUUM cannot be executed inside a transaction and will always fail in a Prisma migration";
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
❌ Bad: VACUUM cannot run inside a transaction block.
   Prisma wraps each migration in BEGIN/COMMIT, so this will always fail.

✅ Good: Run VACUUM outside the migration as a separate maintenance task:
   psql -c "VACUUM ANALYZE \\"table_name\\";"

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line vacuumInMigration
`.trim();
};

export const vacuumInMigrationRule: Rule = {
  name: "vacuumInMigration",
  severity: "error",
  description: "VACUUM cannot run inside a transaction and will always fail in Prisma migrations",
  detect,
  message,
  suggestion,
};
