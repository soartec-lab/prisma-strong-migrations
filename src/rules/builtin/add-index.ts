import type { ParsedStatement } from "../../parser/types";
import type { CheckContext, Rule } from "../types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return statement.type === "createIndex" && statement.concurrently === false;
};

const message = (statement: ParsedStatement): string => {
  return `Adding index "${statement.indexName}" without CONCURRENTLY locks the table`;
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
❌ Bad: Creating an index without CONCURRENTLY acquires a lock that prevents reads and writes

✅ Good: Follow these steps:
   1. Generate migration file only (do not apply yet):
      npx prisma migrate dev --create-only --name add_your_index_name

   2. Edit the generated migration file:
      - Add the following as the FIRST LINE of the file:
        -- prisma-migrate-disable-next-transaction
      - Add CONCURRENTLY to the CREATE INDEX statement:
        CREATE INDEX CONCURRENTLY "index_name" ON "table_name"("column_name");

   3. Apply the migration:
      npx prisma migrate dev

⚠️  Notes:
   - -- prisma-migrate-disable-next-transaction disables transactions for the ENTIRE file.
   - Keep this migration file separate — ideally one statement only.

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_index
`.trim();
};

export const addIndexRule: Rule = {
  name: "add_index",
  severity: "error",
  description: "Adding an index without CONCURRENTLY locks the table",
  detect,
  message,
  suggestion,
};
