# prisma-strong-migrations Rule Details

This document explains the details of each rule detected by prisma-strong-migrations.

---

## Dangerous Operations (Error)

### SM001: removeColumn

**Removing a column**

#### Detection Pattern

```sql
ALTER TABLE "users" DROP COLUMN "name";
```

#### Why It's Dangerous

- **Deployment order issues**: If migration is applied first, old application code that hasn't been deployed yet will error
- **Rolling deployments**: With multiple servers, errors occur while some servers are still running old code
- **Rollback difficulties**: If you rollback the app after column removal, it will try to access the deleted column and error

**Note**: Unlike Rails, Prisma does not cache schema at runtime. However, errors can still occur depending on deployment timing.

#### Safe Approach

1. Remove all references to the column from application code
2. Run `npx prisma generate` to update Prisma Client
3. Deploy code changes
4. Apply the migration

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line removeColumn
ALTER TABLE "users" DROP COLUMN "name";
```

---

### SM002: renameColumn

**Renaming a column**

#### Detection Pattern

```sql
ALTER TABLE "users" RENAME COLUMN "name" TO "full_name";
```

#### Why It's Dangerous

- Prisma Client continues to reference the old column name
- Application code may be using the old column name

#### Safe Approach

1. Add a new column
2. Modify code to write to both columns
3. Backfill data from old column to new column
4. Modify code to read from new column
5. Stop writing to old column
6. Remove old column

---

### SM003: renameTable

**Renaming a table**

#### Detection Pattern

```sql
ALTER TABLE "users" RENAME TO "customers";
```

#### Why It's Dangerous

- Prisma Client continues to reference the old table name
- Application code may be using the old table name

#### Safe Approach

1. Create a new table
2. Modify code to write to both tables
3. Backfill data from old table to new table
4. Modify code to read from new table
5. Stop writing to old table
6. Remove old table

---

### SM004: changeColumnType

**Changing column type**

#### Detection Pattern

```sql
ALTER TABLE "users" ALTER COLUMN "age" TYPE bigint;
```

#### Why It's Dangerous

- In PostgreSQL, the entire table is rewritten
- Reads and writes are blocked during rewrite
- Can take a long time for large tables

#### Safe Type Changes (PostgreSQL)

The following changes can be done safely without table rewrite:

| Original Type  | Safe Change To                 |
| -------------- | ------------------------------ |
| `varchar(n)`   | `varchar(m)` (m > n), `text`   |
| `text`         | `varchar` (no limit)           |
| `numeric(p,s)` | `numeric(p2,s)` (p2 > p)       |
| `timestamp`    | `timestamptz` (in UTC session) |

#### Safe Approach (Other Type Changes)

1. Add a new column
2. Modify code to write to both columns
3. Backfill data from old column to new column
4. Modify code to read from new column
5. Stop writing to old column
6. Remove old column

---

### SM005: addIndex

**Adding index without CONCURRENTLY**

#### Detection Pattern

```sql
CREATE INDEX "users_email_idx" ON "users"("email");
```

#### Why It's Dangerous

- In PostgreSQL, creating an index without CONCURRENTLY blocks writes
- Can block for a long time on large tables

#### Safe Approach

```sql
CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");
```

**Note**: `CONCURRENTLY` cannot be executed within a transaction. Prisma wraps migrations in transactions by default, so you must disable the transaction for this migration file.

#### Prisma Workflow

1. Generate migration with `--create-only`:
   ```bash
   npx prisma migrate dev --create-only --name add_your_index_name
   ```
2. Edit the generated migration file:
   - Add `-- prisma-migrate-disable-next-transaction` as the **first line**
   - Add `CONCURRENTLY` to the `CREATE INDEX` statement
3. Apply the migration:
   ```bash
   npx prisma migrate dev
   ```

**Warning**: `-- prisma-migrate-disable-next-transaction` disables transaction protection for the **entire file**. Keep this migration file minimal — ideally one statement only.

---

### SM006: removeIndex

**Removing index without CONCURRENTLY**

#### Detection Pattern

```sql
DROP INDEX "users_email_idx";
```

#### Why It's Dangerous

- In PostgreSQL, dropping an index without CONCURRENTLY blocks writes

#### Safe Approach

```sql
DROP INDEX CONCURRENTLY "users_email_idx";
```

---

### SM007: addForeignKey

**Adding foreign key constraint (without NOT VALID)**

#### Detection Pattern

```sql
ALTER TABLE "posts"
ADD CONSTRAINT "posts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id");
```

#### Why It's Dangerous

- In PostgreSQL, writes are blocked on both tables
- All existing rows are validated

#### Safe Approach

**Migration 1**: Add constraint without validation

```sql
ALTER TABLE "posts"
ADD CONSTRAINT "posts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
NOT VALID;
```

**Migration 2**: Validate the constraint

```sql
ALTER TABLE "posts"
VALIDATE CONSTRAINT "posts_user_id_fkey";
```

---

### SM008: addCheckConstraint

**Adding CHECK constraint (without NOT VALID)**

#### Detection Pattern

```sql
ALTER TABLE "products"
ADD CONSTRAINT "products_price_check"
CHECK (price > 0);
```

#### Why It's Dangerous

- In PostgreSQL, reads and writes are blocked
- All existing rows are validated

#### Safe Approach

**Migration 1**: Add constraint without validation

```sql
ALTER TABLE "products"
ADD CONSTRAINT "products_price_check"
CHECK (price > 0)
NOT VALID;
```

**Migration 2**: Validate the constraint

```sql
ALTER TABLE "products"
VALIDATE CONSTRAINT "products_price_check";
```

---

### SM009: addUniqueConstraint

**Adding UNIQUE constraint**

#### Detection Pattern

```sql
ALTER TABLE "users"
ADD CONSTRAINT "users_email_unique"
UNIQUE ("email");
```

#### Why It's Dangerous

- In PostgreSQL, adding a UNIQUE constraint creates a unique index
- This blocks reads and writes

#### Safe Approach

**Migration 1**: Create unique index with CONCURRENTLY

```sql
CREATE UNIQUE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");
```

**Migration 2**: Add constraint using the index

```sql
ALTER TABLE "users"
ADD CONSTRAINT "users_email_unique"
UNIQUE USING INDEX "users_email_idx";
```

---

### SM010: addExclusionConstraint

**Adding EXCLUSION constraint**

#### Detection Pattern

```sql
ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_no_overlap"
EXCLUDE USING gist (room_id WITH =, tsrange(start_time, end_time) WITH &&);
```

#### Why It's Dangerous

- In PostgreSQL, reads and writes are blocked
- All existing rows are validated
- EXCLUSION constraints do not support `NOT VALID`

#### Safe Approach

There is currently no safe approach. Consider:

- Execute during a maintenance window
- Only use when the table is small
- Consider application-level validation

---

### SM011: setNotNull

**Setting NOT NULL constraint**

#### Detection Pattern

```sql
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
```

#### Why It's Dangerous

- In PostgreSQL, reads and writes are blocked
- All existing rows are validated to ensure they are not NULL

#### Safe Approach

**Migration 1**: Add CHECK constraint without validation

```sql
ALTER TABLE "users"
ADD CONSTRAINT "users_email_not_null"
CHECK ("email" IS NOT NULL)
NOT VALID;
```

**Migration 2**: Validate CHECK constraint and set NOT NULL

```sql
ALTER TABLE "users" VALIDATE CONSTRAINT "users_email_not_null";
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "users" DROP CONSTRAINT "users_email_not_null";
```

---

### SM012: addJsonColumn

**Adding json type column**

#### Detection Pattern

```sql
ALTER TABLE "users" ADD COLUMN "metadata" json;
```

#### Why It's Dangerous

- PostgreSQL's `json` type has no equality operator
- `SELECT DISTINCT` queries may error
- Cannot efficiently use indexes

#### Safe Approach

Use `jsonb` type instead:

```sql
ALTER TABLE "users" ADD COLUMN "metadata" jsonb;
```

#### Prisma Configuration

```prisma
model User {
  metadata Json @db.JsonB
}
```

---

### SM013: addVolatileDefault

**Adding column with volatile default value**

#### Detection Pattern

```sql
ALTER TABLE "users" ADD COLUMN "id" uuid DEFAULT gen_random_uuid();
```

#### Why It's Dangerous

- In PostgreSQL, adding a column with a volatile default value (`gen_random_uuid()`, `now()`, etc.) causes the entire table to be rewritten
- Reads and writes are blocked during rewrite

#### Safe Approach

**Migration 1**: Add column without default value

```sql
ALTER TABLE "users" ADD COLUMN "uuid" uuid;
```

**Migration 2**: Set default value

```sql
ALTER TABLE "users" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
```

**Migration 3**: Backfill existing rows (outside transaction)

```sql
UPDATE "users" SET "uuid" = gen_random_uuid() WHERE "uuid" IS NULL;
```

---

### SM014: addAutoIncrement

**Adding auto-increment column**

#### Detection Pattern

```sql
ALTER TABLE "users" ADD COLUMN "id" SERIAL;
-- or
ALTER TABLE "users" ADD COLUMN "id" BIGSERIAL;
```

#### Why It's Dangerous

- In PostgreSQL, the entire table is rewritten
- Reads and writes are blocked during rewrite

#### Safe Approach

Create a new table and migrate data (similar procedure to SM003: renameTable).

---

### SM015: addStoredGenerated

**Adding STORED generated column**

#### Detection Pattern

```sql
ALTER TABLE "users"
ADD COLUMN "full_name" text
GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;
```

#### Why It's Dangerous

- In PostgreSQL, the entire table is rewritten
- Reads and writes are blocked during rewrite

#### Safe Approach

- Add a regular column and set value with a trigger
- Or use VIRTUAL generated column (PostgreSQL 12+)

---

### SM016: renameSchema

**Renaming a schema**

#### Detection Pattern

```sql
ALTER SCHEMA "old_schema" RENAME TO "new_schema";
```

#### Why It's Dangerous

- Application may be referencing the old schema name
- Connection strings or search_path settings may break

#### Safe Approach

1. Create a new schema
2. Modify code to write to both schemas
3. Backfill data from old schema to new schema
4. Modify code to read from new schema
5. Stop writing to old schema
6. Remove old schema

---

### SM017: create_table_force

**Dropping existing table before creating**

#### Detection Pattern

```sql
DROP TABLE IF EXISTS "users";
CREATE TABLE "users" (...);
```

#### Why It's Dangerous

- Existing data is lost
- Potential for unintended data loss

#### Safe Approach

- Explicitly execute `DROP TABLE` with full understanding of the impact
- Or only create table if it doesn't exist

---

### dropTable

**Dropping a table**

#### Detection Pattern

```sql
DROP TABLE "users";
```

#### Why It's Dangerous

- Prisma generates `DROP TABLE` when a model is removed from `schema.prisma`
- All data is permanently lost
- Other tables referencing this table via foreign keys may break

#### Safe Approach

1. Remove all references to the model from application code
2. Run `npx prisma generate` to update Prisma Client
3. Deploy the application code changes
4. Then apply this migration

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line dropTable
DROP TABLE "users";
```

---

### disableTransactionWarning

**Migration running without transaction protection**

#### Detection Pattern

```sql
-- prisma-migrate-disable-next-transaction
```

#### Why It's Dangerous

- `-- prisma-migrate-disable-next-transaction` disables the transaction wrapper for the **entire migration file**
- If any statement in the file fails, the database may be left in a partial state with no automatic rollback

#### Safe Approach

Keep the migration file minimal — ideally **one statement only** — when using this comment.

```sql
-- prisma-migrate-disable-next-transaction

CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");
```

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line disableTransactionWarning
-- prisma-migrate-disable-next-transaction
```

---

### addNotNullWithoutDefault

**Adding a NOT NULL column without a default value**

#### Detection Pattern

```sql
ALTER TABLE "users" ADD COLUMN "status" text NOT NULL;
```

#### Why It's Dangerous

- Prisma generates this SQL when a required field (no `?`) without `@default` is added to a model
- PostgreSQL rejects this statement if the table already has existing rows

#### Safe Approach

**Migration 1**: Add column with a temporary default value

```sql
ALTER TABLE "users" ADD COLUMN "status" text NOT NULL DEFAULT 'active';
```

**Migration 2**: Remove the default if it was only needed for backfill

```sql
ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;
```

Alternatively, add `@default(...)` to the Prisma schema before generating the migration, then remove it after deploying.

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line addNotNullWithoutDefault
ALTER TABLE "users" ADD COLUMN "status" text NOT NULL;
```

---

## Best Practices (Warning)

### SM101: indexColumnsCount

**Non-unique index with 4+ columns**

#### Detection Pattern

```sql
CREATE INDEX "users_multi_idx" ON "users"("a", "b", "c", "d");
```

#### Why It's a Warning

- Non-unique indexes with 4+ columns rarely improve performance
- Index size increases and updates become slower
- Often only the first few columns are effectively used

#### Recommendations

- Start with the most selective columns
- Limit to 2-3 columns
- Analyze query patterns to determine necessary indexes

---

## Custom Rule Examples

### require_index_on_uuid

**Require index on UUID columns**

```javascript
// prisma-strong-migrations-rules/require-index-on-uuid.js
module.exports = {
  name: "require_index_on_uuid",
  code: "CUSTOM001",
  severity: "warning",
  description: "UUID columns should have an index for better query performance",

  detect: (stmt, context) => {
    if (stmt.type !== "alter_table" || stmt.action !== "add_column") {
      return false;
    }

    if (stmt.dataType !== "uuid") {
      return false;
    }

    // Check if there's a corresponding index creation
    const hasIndex = context.statements.some(
      (s) => s.type === "create_index" && s.columns?.includes(stmt.column),
    );

    return !hasIndex;
  },

  message: (stmt) => {
    return `UUID column "${stmt.column}" added without an index`;
  },

  suggestion: (stmt) => {
    return `
Consider adding an index for the UUID column:

\`\`\`sql
CREATE INDEX CONCURRENTLY "${stmt.table}_${stmt.column}_idx" 
ON "${stmt.table}"("${stmt.column}");
\`\`\`
    `.trim();
  },
};
```

### no_nullable_foreign_key

**Disallow nullable foreign keys**

```javascript
// prisma-strong-migrations-rules/no-nullable-foreign-key.js
module.exports = {
  name: "no_nullable_foreign_key",
  code: "CUSTOM002",
  severity: "warning",
  description: "Foreign key columns should not be nullable",

  detect: (stmt, context) => {
    if (stmt.type !== "alter_table" || stmt.action !== "add_column") {
      return false;
    }

    // Check if this column has a foreign key constraint
    const hasForeignKey = context.statements.some(
      (s) =>
        s.type === "alter_table" &&
        s.action === "add_constraint" &&
        s.constraintType === "foreign_key" &&
        s.column === stmt.column,
    );

    // Check if column is nullable (no NOT NULL)
    const isNullable = !stmt.notNull;

    return hasForeignKey && isNullable;
  },

  message: (stmt) => {
    return `Foreign key column "${stmt.column}" is nullable`;
  },

  suggestion: (stmt) => {
    return `
Consider making the foreign key column NOT NULL:

\`\`\`sql
ALTER TABLE "${stmt.table}" 
ALTER COLUMN "${stmt.column}" SET NOT NULL;
\`\`\`

Or if NULL values are intentional, add a partial index:

\`\`\`sql
CREATE INDEX CONCURRENTLY "${stmt.table}_${stmt.column}_not_null_idx"
ON "${stmt.table}"("${stmt.column}")
WHERE "${stmt.column}" IS NOT NULL;
\`\`\`
    `.trim();
  },
};
```

---

## Rule Configuration

### Disabling Rules

In `prisma-strong-migrations.config.js`:

```javascript
module.exports = {
  disabledRules: [
    "addJsonColumn", // We use json intentionally
    "indexColumnsCount", // We have specific query patterns
  ],
};
```

### Changing Severity

```javascript
module.exports = {
  rules: {
    addJsonColumn: {
      severity: "error", // Upgrade from warning to error
    },
    removeColumn: {
      severity: "warning", // Downgrade from error to warning
    },
  },
};
```

### Ignoring Specific Migrations

```javascript
module.exports = {
  ignoreMigrations: [
    "20240101_initial_migration", // Skip initial migration
    "*_seed_*", // Skip all seed migrations
  ],
};
```
