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

### SM018: truncateTable

**TRUNCATE deletes all rows with an AccessExclusiveLock**

#### Detection Pattern

```sql
TRUNCATE TABLE "users";
TRUNCATE "users";
```

#### Why It's Dangerous

- Acquires an `AccessExclusiveLock`, blocking all reads and writes for the duration
- Propagates locks to tables referenced by foreign keys
- Permanently deletes all rows — fatal if run in production by mistake

#### Safe Approach

Delete rows in application code where the scope can be controlled:

```typescript
await prisma.users.deleteMany({});
```

Or limit TRUNCATE to development/staging environments only.

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line truncateTable
TRUNCATE TABLE "users";
```

---

### SM021: disableTrigger

**DISABLE TRIGGER bypasses constraint checks and may corrupt data integrity**

#### Detection Pattern

```sql
ALTER TABLE "users" DISABLE TRIGGER ALL;
ALTER TABLE "users" DISABLE TRIGGER "audit_trigger";
```

#### Why It's Dangerous

- Disables triggers including those enforcing foreign key constraints
- Data inserted or updated while triggers are disabled may violate referential integrity
- If the migration fails after DISABLE and before ENABLE, triggers remain off permanently

#### Safe Approach

Do not disable triggers in migrations. If unavoidable, ensure `ENABLE TRIGGER` is called before the migration ends:

```sql
ALTER TABLE "users" DISABLE TRIGGER ALL;
-- ... data operations ...
ALTER TABLE "users" ENABLE TRIGGER ALL;
```

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line disableTrigger
ALTER TABLE "users" DISABLE TRIGGER ALL;
```

---

### SM023: vacuumInMigration

**VACUUM cannot run inside a transaction**

#### Detection Pattern

```sql
VACUUM ANALYZE "users";
VACUUM "users";
VACUUM;
```

#### Why It's Dangerous

- PostgreSQL does not allow `VACUUM` inside a transaction block
- Prisma wraps every migration in `BEGIN/COMMIT`, so this statement will always fail with an error
- The migration will be marked as failed and require manual intervention

#### Safe Approach

Run VACUUM as a separate maintenance task outside migrations:

```bash
psql -c "VACUUM ANALYZE \"users\";"
```

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line vacuumInMigration
VACUUM ANALYZE "users";
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

### SM019: setTablespace

**SET TABLESPACE physically moves the table with an AccessExclusiveLock**

#### Detection Pattern

```sql
ALTER TABLE "users" SET TABLESPACE pg_default;
```

#### Why It's a Warning

- Physically relocates the table to another storage area, rewriting all data
- Holds an `AccessExclusiveLock` for the entire duration of the move
- On large tables, this can block production traffic for minutes or hours

#### Safe Approach

Run this operation during a scheduled low-traffic maintenance window, not as part of a regular migration.

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line setTablespace
ALTER TABLE "users" SET TABLESPACE pg_default;
```

---

### SM020: clusterTable

**CLUSTER physically rewrites the table with an AccessExclusiveLock**

#### Detection Pattern

```sql
CLUSTER "users" USING "users_pkey";
CLUSTER "users";
```

#### Why It's a Warning

- Physically rewrites the table in index order, holding an `AccessExclusiveLock` throughout
- On large tables, this blocks all reads and writes for a long time
- The clustering benefit degrades over time as new rows are inserted

#### Safe Approach

Consider alternatives that avoid a full table lock:

- **pg_repack**: reorders rows without holding an exclusive lock
- **VACUUM**: reclaims dead tuples with a lighter lock

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line clusterTable
CLUSTER "users" USING "users_pkey";
```

---

### SM022: createTableAsSelect

**CREATE TABLE AS SELECT may take a long time on large tables**

#### Detection Pattern

```sql
CREATE TABLE "users_backup" AS SELECT * FROM "users";
```

#### Why It's a Warning

- Copies all rows from the source table, which can be very slow on large tables
- Holds locks on the source table during the copy
- Running a long data copy inside a migration risks timeout and partial failures

#### Safe Approach

Run backups outside the migration:

```bash
# Use pg_dump for point-in-time backups
pg_dump -t users mydb > users_backup.sql
```

If a copy is necessary, create the table structure first, then backfill outside the migration.

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line createTableAsSelect
CREATE TABLE "users_backup" AS SELECT * FROM "users";
```

---

## Prisma-Specific Rules

The following rules detect issues specific to how Prisma wraps migrations in transactions and how concurrent index operations interact with Prisma's migration runner.

---

### concurrentWithoutDisableTransaction

**CREATE/DROP INDEX CONCURRENTLY requires disabling the transaction**

#### Detection Pattern

```sql
CREATE INDEX CONCURRENTLY "idx_users_email" ON "users"("email");
DROP INDEX CONCURRENTLY "idx_users_email";
```

#### Why It's Dangerous

- Prisma wraps every migration file in a transaction by default
- PostgreSQL does not allow `CONCURRENTLY` operations inside a transaction block
- The migration will fail at runtime with: `ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block`

#### Safe Approach

Add `-- prisma-migrate-disable-next-transaction` as the first line of the migration file:

```sql
-- prisma-migrate-disable-next-transaction
CREATE INDEX CONCURRENTLY "idx_users_email" ON "users"("email");
```

Keep the file to one statement only — disabling the transaction removes rollback protection.

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line concurrentWithoutDisableTransaction
CREATE INDEX CONCURRENTLY "idx_users_email" ON "users"("email");
```

---

### notValidValidateSameFile

**VALIDATE CONSTRAINT in the same file as NOT VALID negates the lock optimization**

#### Detection Pattern

```sql
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") NOT VALID;
ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_user_id_fkey";
```

#### Why It's Dangerous

- The purpose of `NOT VALID` is to defer the full table scan (and heavy lock) to a later `VALIDATE CONSTRAINT` step
- When both are in the same migration file, they run in the same transaction — the optimization is completely lost
- The full table scan and `ShareRowExclusiveLock` still occur together, blocking reads and writes

#### Safe Approach

Split into two separate migration files:

```sql
-- migration_1.sql
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") NOT VALID;

-- migration_2.sql (run after deploying migration_1)
ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_user_id_fkey";
```

`VALIDATE CONSTRAINT` run separately uses a `ShareUpdateExclusiveLock` that allows concurrent reads and writes.

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line notValidValidateSameFile
ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_user_id_fkey";
```

---

### mixedStatementsWithDisabledTransaction

**Multiple statements in a migration with disabled transaction have no rollback protection**

#### Detection Pattern

```sql
-- prisma-migrate-disable-next-transaction
CREATE INDEX CONCURRENTLY "idx_a" ON "users"("email");
ALTER TABLE "users" ADD COLUMN "name" text;
```

#### Why It's Dangerous

- When `-- prisma-migrate-disable-next-transaction` is present, the entire file runs without a transaction
- If any statement fails partway through, all previous statements in the file are already committed and cannot be rolled back
- This can leave the database in a partial state

#### Safe Approach

Keep files with `-- prisma-migrate-disable-next-transaction` to one SQL statement only:

```sql
-- prisma-migrate-disable-next-transaction
CREATE INDEX CONCURRENTLY "idx_a" ON "users"("email");
```

Move other DDL statements to a separate migration file.

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line mixedStatementsWithDisabledTransaction
-- prisma-migrate-disable-next-transaction
```

---

### updateWithoutWhere

**UPDATE without WHERE clause will affect all rows**

#### Detection Pattern

```sql
UPDATE "users" SET "status" = 'active';
```

#### Why It's a Warning

- Updating every row in a large table takes a long time and holds row locks throughout
- In production, this can cause lock contention and timeouts for concurrent writes
- Often a mistake — most backfills are intended for a subset of rows

#### Safe Approach

Add a WHERE clause to limit the affected rows:

```sql
UPDATE "users" SET "status" = 'active' WHERE "status" IS NULL;
```

If intentionally updating all rows, make it explicit:

```sql
UPDATE "users" SET "status" = 'active' WHERE 1=1; -- intentional full update
```

For large tables, consider doing the backfill in batches from application code instead.

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line updateWithoutWhere
UPDATE "users" SET "status" = 'active';
```

---

### deleteWithoutWhere

**DELETE FROM without WHERE clause will delete all rows**

#### Detection Pattern

```sql
DELETE FROM "sessions";
```

#### Why It's a Warning

- Deleting every row in a large table takes a long time and holds locks throughout
- Often a mistake — most cleanup operations are intended for a subset of rows
- Unlike `TRUNCATE`, `DELETE` is fully logged and slower on large tables

#### Safe Approach

Add a WHERE clause to limit the deleted rows:

```sql
DELETE FROM "sessions" WHERE "expires_at" < NOW();
```

If intentionally deleting all rows, consider `TRUNCATE TABLE` (with its own risks) or:

```sql
DELETE FROM "sessions" WHERE 1=1; -- intentional full delete
```

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line deleteWithoutWhere
DELETE FROM "sessions";
```

---

### backfillInMigration

**UPDATE mixed with schema changes should be in a separate migration**

#### Detection Pattern

```sql
ALTER TABLE "users" ADD COLUMN "full_name" text;
UPDATE "users" SET "full_name" = first_name || ' ' || last_name;
```

#### Why It's Dangerous

- Mixing `ALTER TABLE` schema changes and `UPDATE` backfills in the same migration can cause long-running locks on large tables
- The `ALTER TABLE` acquires an `AccessExclusiveLock` and the subsequent `UPDATE` holds row locks — both in the same transaction
- The combination blocks all reads and writes for the duration of the backfill

#### Safe Approach

Split into two separate migration files:

```sql
-- migration_1.sql: schema change only
ALTER TABLE "users" ADD COLUMN "full_name" text;

-- migration_2.sql: backfill only (run after deploying migration_1)
UPDATE "users" SET "full_name" = first_name || ' ' || last_name;
```

For large tables, do the backfill in batches from application code after the column is added.

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line backfillInMigration
UPDATE "users" SET "full_name" = first_name || ' ' || last_name;
```

---

### enumValueRemoval

**Removing a value from a PostgreSQL ENUM type**

#### Detection Pattern

```sql
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";
DROP TYPE "Role_old";
```

#### Why It's Dangerous

- PostgreSQL cannot remove ENUM values directly — Prisma recreates the type with fewer values
- If existing rows contain the removed value, the `ALTER COLUMN ... TYPE` step will fail
- If Prisma Client is deployed before the migration, it will throw runtime errors referencing a value that no longer exists in the database

#### Safe Approach

1. Remove all references to the enum value from application code
2. Deploy the code changes
3. Backfill existing data: `UPDATE "table" SET "col" = 'OTHER_VALUE' WHERE "col" = 'REMOVED_VALUE'`
4. Apply this migration
5. Run `npx prisma generate` and deploy the updated Prisma Client

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line enumValueRemoval
ALTER TYPE "Role" RENAME TO "Role_old";
```

---

### implicitM2mTableChange

**Directly modifying a Prisma-managed implicit M2M join table**

#### Detection Pattern

```sql
ALTER TABLE "_CategoryToPost" ADD COLUMN "extra" TEXT;
DROP TABLE "_CategoryToPost";
CREATE INDEX ON "_CategoryToPost"("A");
```

#### Why It's Dangerous

- Prisma auto-generates and manages implicit M2M tables (named `_AToB`)
- Direct modifications bypass Prisma's relation management, causing queries to fail or produce incorrect results
- The schema becomes out of sync with Prisma's expectations

#### Safe Approach

Convert to an explicit M2M relation in `schema.prisma`:

```prisma
model CategoriesOnPosts {
  post       Post     @relation(fields: [postId], references: [id])
  postId     Int
  category   Category @relation(fields: [categoryId], references: [id])
  categoryId Int
  @@id([postId, categoryId])
}
```

Then run `npx prisma migrate dev` to let Prisma regenerate the migration.

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line implicitM2mTableChange
ALTER TABLE "_CategoryToPost" ADD COLUMN "extra" TEXT;
```

---

### intPrimaryKey

**Using SERIAL (32-bit integer) for a primary key**

#### Detection Pattern

```sql
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    ...
);
```

#### Why It's Dangerous

- `SERIAL` is a 32-bit integer with a maximum value of ~2.1 billion
- Large-scale services can exhaust this limit
- Migrating from `Int` to `BigInt` later requires a full table rewrite and cascading changes to all foreign key columns — making it nearly impossible in production

#### Safe Approach

Use `BigInt` or UUID v7 from the start in `schema.prisma`:

```prisma
model User {
  id BigInt @id @default(autoincrement())  // 64-bit, ~9.2 quintillion
  // or
  id String @id @default(uuid(7))          // UUID v7, time-sortable
}
```

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line intPrimaryKey
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    ...
);
```

---

### cuidUuidDefaultRemoval

**Dropping the database-level DEFAULT from an id column**

#### Detection Pattern

```sql
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;
```

#### Why It's Dangerous

- Prisma generates `cuid()` and `uuid()` values in the application layer
- If the `id` column relies on a database-level default (e.g. `gen_random_uuid()`), dropping it will break ID generation for any inserts that bypass Prisma Client

#### Safe Approach

If you need to change the ID generation strategy, update `schema.prisma` and let Prisma regenerate the migration:

```prisma
model User {
  id String @id @default(uuid(7))
}
```

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line cuidUuidDefaultRemoval
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;
```

---

### prismaManagedColumnChange

**Modifying a Prisma-managed column (e.g. @updatedAt) at the database level**

#### Detection Pattern

```sql
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT NOW();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

#### Why It's Dangerous

- Prisma's `@updatedAt` annotation automatically sets the column value on every update via Prisma Client
- Adding a DB-level `DEFAULT` or `TRIGGER` for the same column creates a conflict — both Prisma and the database manage the value
- This can lead to unexpected behavior, duplicate writes, or subtle bugs

#### Safe Approach

Let Prisma manage `@updatedAt` exclusively. Remove the DB-level `DEFAULT` or `TRIGGER` and use the annotation in `schema.prisma`:

```prisma
model User {
  updatedAt DateTime @updatedAt
}
```

#### How to Skip

```sql
-- prisma-strong-migrations-disable-next-line prismaManagedColumnChange
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
```

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
