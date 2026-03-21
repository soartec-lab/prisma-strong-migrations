# prisma-strong-migrations

Catch unsafe migrations in development for Prisma + PostgreSQL

✓ Detects potentially dangerous operations  
✓ Prevents them from being applied by default  
✓ Provides instructions on safer ways to do what you want

Inspired by [strong_migrations](https://github.com/ankane/strong_migrations) for Ruby on Rails.

## Installation

```bash
npm install prisma-strong-migrations --save-dev
# or
yarn add prisma-strong-migrations --dev
# or
pnpm add prisma-strong-migrations --save-dev
```

## How It Works

When you create a migration that's potentially dangerous, you'll see an error message like:

```
$ npx prisma-strong-migrations check

🔍 Checking migration: 20240320_remove_user_name

=== ❌ Dangerous operation detected [removeColumn] ===

📍 Line 3: ALTER TABLE "users" DROP COLUMN "name"

❌ Bad: Removing a column may cause application errors

✅ Good: Follow these steps:
   1. Remove all usages of 'name' field from your code
   2. Run 'npx prisma generate' to update Prisma Client
   3. Deploy the code changes
   4. Then apply this migration

📚 More info: https://github.com/xxx/prisma-strong-migrations#removing-a-column

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line removeColumn

Found 1 issue (1 error, 0 warnings)
```

## Usage

### Recommended Workflow

```bash
# 1. Modify your schema
vim prisma/schema.prisma

# 2. Create migration without applying
npx prisma migrate dev --create-only --name add_feature

# 3. Check the generated SQL
npx prisma-strong-migrations check

# 4a. If safe, apply the migration
npx prisma migrate dev

# 4b. If issues found:
#     - Fix using the suggested safe approach, OR
#     - Add disable comment if intentional
```

## Checks

Potentially dangerous operations:

- [prisma-strong-migrations](#prisma-strong-migrations)
  - [Installation](#installation)
  - [How It Works](#how-it-works)
  - [Usage](#usage)
    - [Recommended Workflow](#recommended-workflow)
  - [Checks](#checks)
    - [Removing a column](#removing-a-column)
      - [Bad](#bad)
      - [Good](#good)
    - [Renaming a column](#renaming-a-column)
      - [Bad](#bad-1)
      - [Good](#good-1)
    - [Renaming a table](#renaming-a-table)
      - [Bad](#bad-2)
      - [Good](#good-2)
    - [Changing the type of a column](#changing-the-type-of-a-column)
      - [Bad](#bad-3)
      - [Good](#good-3)
    - [Adding an index non-concurrently](#adding-an-index-non-concurrently)
      - [Bad](#bad-4)
      - [Good](#good-4)
    - [Removing an index non-concurrently](#removing-an-index-non-concurrently)
      - [Bad](#bad-5)
      - [Good](#good-5)
    - [Adding a foreign key](#adding-a-foreign-key)
      - [Bad](#bad-6)
      - [Good](#good-6)
    - [Adding a check constraint](#adding-a-check-constraint)
      - [Bad](#bad-7)
      - [Good](#good-7)
    - [Adding a unique constraint](#adding-a-unique-constraint)
      - [Bad](#bad-8)
      - [Good](#good-8)
    - [Adding an exclusion constraint](#adding-an-exclusion-constraint)
      - [Bad](#bad-9)
      - [Good](#good-9)
    - [Setting NOT NULL on an existing column](#setting-not-null-on-an-existing-column)
      - [Bad](#bad-10)
      - [Good](#good-10)
    - [Adding a json column](#adding-a-json-column)
      - [Bad](#bad-11)
      - [Good](#good-11)
    - [Adding a column with a volatile default value](#adding-a-column-with-a-volatile-default-value)
      - [Bad](#bad-12)
      - [Good](#good-12)
    - [Adding an auto-incrementing column](#adding-an-auto-incrementing-column)
      - [Bad](#bad-13)
      - [Good](#good-13)
    - [Adding a stored generated column](#adding-a-stored-generated-column)
      - [Bad](#bad-14)
      - [Good](#good-14)
    - [Renaming a schema](#renaming-a-schema)
      - [Bad](#bad-15)
      - [Good](#good-15)
    - [Keeping non-unique indexes to three columns or less](#keeping-non-unique-indexes-to-three-columns-or-less)
      - [Bad](#bad-16)
      - [Good](#good-16)
  - [Skipping Checks](#skipping-checks)
    - [Skip multiple rules](#skip-multiple-rules)
    - [Skip all rules for a statement](#skip-all-rules-for-a-statement)
  - [Configuration](#configuration)
  - [Custom Rules](#custom-rules)
  - [CI Integration](#ci-integration)
  - [Development](#development)
    - [Using devcontainer (Recommended)](#using-devcontainer-recommended)
    - [Available Commands](#available-commands)
  - [Documentation](#documentation)
  - [Credits](#credits)
  - [License](#license)

Best practices:

- [Keeping non-unique indexes to three columns or less](#keeping-non-unique-indexes-to-three-columns-or-less)

---

### Removing a column

#### Bad

Removing a column may cause application errors. If you deploy the migration before updating your application code, requests handled by old application instances will fail.

```sql
ALTER TABLE "users" DROP COLUMN "name";
```

#### Good

1. Remove all usages of the `name` field from your application code
2. Run `npx prisma generate` to update Prisma Client
3. Deploy the code changes
4. Then apply this migration with a disable comment:

```sql
-- prisma-strong-migrations-disable-next-line removeColumn
-- Reason: All references removed in PR #123
ALTER TABLE "users" DROP COLUMN "name";
```

---

### Renaming a column

#### Bad

Renaming a column that's in use will cause errors in your application.

```sql
ALTER TABLE "users" RENAME COLUMN "name" TO "full_name";
```

#### Good

A safer approach is to:

1. Create a new column
2. Write to both columns in your application
3. Backfill data from the old column to the new column
4. Move reads from the old column to the new column
5. Stop writing to the old column
6. Drop the old column

---

### Renaming a table

#### Bad

Renaming a table that's in use will cause errors in your application.

```sql
ALTER TABLE "users" RENAME TO "customers";
```

#### Good

A safer approach is to:

1. Create a new table
2. Write to both tables in your application
3. Backfill data from the old table to the new table
4. Move reads from the old table to the new table
5. Stop writing to the old table
6. Drop the old table

---

### Changing the type of a column

#### Bad

Changing the type of a column causes the entire table to be rewritten. During this time, reads and writes are blocked.

```sql
ALTER TABLE "users" ALTER COLUMN "age" TYPE bigint;
```

Some changes don't require a table rewrite and are safe in Postgres:

| Type           | Safe Changes                                            |
| -------------- | ------------------------------------------------------- |
| `varchar(n)`   | Increasing or removing limit, changing to `text`        |
| `text`         | Changing to `varchar` with no limit                     |
| `numeric(p,s)` | Increasing precision at same scale                      |
| `timestamp`    | Changing to `timestamptz` when session time zone is UTC |

#### Good

For other type changes, a safer approach is to:

1. Create a new column
2. Write to both columns in your application
3. Backfill data from the old column to the new column
4. Move reads from the old column to the new column
5. Stop writing to the old column
6. Drop the old column

---

### Adding an index non-concurrently

#### Bad

Adding an index non-concurrently blocks writes.

```sql
CREATE INDEX "users_email_idx" ON "users"("email");
```

#### Good

Add indexes concurrently. Because Prisma wraps migrations in transactions by default, you must disable the transaction for this migration file.

1. Generate migration file only:
   ```bash
   npx prisma migrate dev --create-only --name add_users_email_index
   ```
2. Edit the generated file — add `-- prisma-migrate-disable-next-transaction` as the first line, then add `CONCURRENTLY`:
   ```sql
   -- prisma-migrate-disable-next-transaction
   CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");
   ```
3. Apply the migration:
   ```bash
   npx prisma migrate dev
   ```

> **Note:** `-- prisma-migrate-disable-next-transaction` disables transaction protection for the **entire file**. Keep this migration file minimal — ideally one statement only.

---

### Removing an index non-concurrently

#### Bad

Removing an index non-concurrently blocks writes.

```sql
DROP INDEX "users_email_idx";
```

#### Good

Remove indexes concurrently.

```sql
DROP INDEX CONCURRENTLY "users_email_idx";
```

---

### Adding a foreign key

#### Bad

Adding a foreign key blocks writes on both tables.

```sql
ALTER TABLE "posts"
ADD CONSTRAINT "posts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id");
```

#### Good

Add the foreign key without validating existing rows, then validate in a separate migration.

**Migration 1:**

```sql
ALTER TABLE "posts"
ADD CONSTRAINT "posts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
NOT VALID;
```

**Migration 2:**

```sql
ALTER TABLE "posts"
VALIDATE CONSTRAINT "posts_user_id_fkey";
```

---

### Adding a check constraint

#### Bad

Adding a check constraint blocks reads and writes while every row is checked.

```sql
ALTER TABLE "products"
ADD CONSTRAINT "products_price_check"
CHECK (price > 0);
```

#### Good

Add the check constraint without validating existing rows, then validate in a separate migration.

**Migration 1:**

```sql
ALTER TABLE "products"
ADD CONSTRAINT "products_price_check"
CHECK (price > 0)
NOT VALID;
```

**Migration 2:**

```sql
ALTER TABLE "products"
VALIDATE CONSTRAINT "products_price_check";
```

---

### Adding a unique constraint

#### Bad

Adding a unique constraint creates a unique index, which blocks reads and writes.

```sql
ALTER TABLE "users"
ADD CONSTRAINT "users_email_unique"
UNIQUE ("email");
```

#### Good

Create a unique index concurrently, then use it for the constraint.

**Migration 1:**

```sql
CREATE UNIQUE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");
```

**Migration 2:**

```sql
ALTER TABLE "users"
ADD CONSTRAINT "users_email_unique"
UNIQUE USING INDEX "users_email_idx";
```

---

### Adding an exclusion constraint

#### Bad

Adding an exclusion constraint blocks reads and writes while every row is checked.

```sql
ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_no_overlap"
EXCLUDE USING gist (room_id WITH =, tsrange(start_time, end_time) WITH &&);
```

#### Good

There's no safe way to add an exclusion constraint (they cannot be marked `NOT VALID`). Consider:

- Running during a maintenance window
- Using application-level validation instead

---

### Setting NOT NULL on an existing column

#### Bad

Setting `NOT NULL` on an existing column blocks reads and writes while every row is checked.

```sql
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
```

#### Good

Add a check constraint first, then set `NOT NULL`.

**Migration 1:**

```sql
ALTER TABLE "users"
ADD CONSTRAINT "users_email_not_null"
CHECK ("email" IS NOT NULL)
NOT VALID;
```

**Migration 2:**

```sql
ALTER TABLE "users" VALIDATE CONSTRAINT "users_email_not_null";
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "users" DROP CONSTRAINT "users_email_not_null";
```

---

### Adding a json column

#### Bad

In Postgres, there's no equality operator for the `json` column type, which can cause errors for `SELECT DISTINCT` queries.

```sql
ALTER TABLE "users" ADD COLUMN "metadata" json;
```

#### Good

Use `jsonb` instead.

```sql
ALTER TABLE "users" ADD COLUMN "metadata" jsonb;
```

In Prisma schema:

```prisma
model User {
  metadata Json @db.JsonB
}
```

---

### Adding a column with a volatile default value

#### Bad

Adding a column with a volatile default value (like `gen_random_uuid()` or `now()`) causes the entire table to be rewritten.

```sql
ALTER TABLE "users" ADD COLUMN "uuid" uuid DEFAULT gen_random_uuid();
```

#### Good

Add the column without a default value, then change the default.

**Migration 1:**

```sql
ALTER TABLE "users" ADD COLUMN "uuid" uuid;
ALTER TABLE "users" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid();
```

Then backfill existing rows in batches (outside a transaction):

```sql
UPDATE "users" SET "uuid" = gen_random_uuid() WHERE "uuid" IS NULL;
```

---

### Adding an auto-incrementing column

#### Bad

Adding an auto-incrementing column (`SERIAL` or `BIGSERIAL`) causes the entire table to be rewritten.

```sql
ALTER TABLE "users" ADD COLUMN "id" SERIAL;
```

#### Good

Create a new table and migrate the data with the same steps as [renaming a table](#renaming-a-table).

---

### Adding a stored generated column

#### Bad

Adding a stored generated column causes the entire table to be rewritten.

```sql
ALTER TABLE "users"
ADD COLUMN "full_name" text
GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;
```

#### Good

Add a non-generated column and use triggers or application logic instead.

---

### Renaming a schema

#### Bad

Renaming a schema that's in use will cause errors in your application.

```sql
ALTER SCHEMA "old_schema" RENAME TO "new_schema";
```

#### Good

A safer approach is to:

1. Create a new schema
2. Write to both schemas in your application
3. Backfill data from the old schema to the new schema
4. Move reads from the old schema to the new schema
5. Stop writing to the old schema
6. Drop the old schema

---

### Dropping a table

#### Bad

Dropping a table that's still referenced by application code will cause errors. All data is permanently lost.

```sql
DROP TABLE "users";
```

#### Good

1. Remove all references to the model from application code
2. Run `npx prisma generate` to update Prisma Client
3. Deploy the application code changes
4. Then apply this migration with a disable comment:

```sql
-- prisma-strong-migrations-disable-next-line dropTable
-- Reason: Model removed in PR #456, all references cleaned up
DROP TABLE "users";
```

---

### Disabling transaction protection

#### Bad

Using `-- prisma-migrate-disable-next-transaction` disables rollback for the entire file. Mixing other DDL statements risks a partial state on failure.

```sql
-- prisma-migrate-disable-next-transaction
CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");
ALTER TABLE "users" ADD COLUMN "bio" text;
```

#### Good

Keep the file to one statement only when disabling transactions.

```sql
-- prisma-migrate-disable-next-transaction
CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");
```

---

### Adding a NOT NULL column without a default value

#### Bad

Adding a NOT NULL column without a default value fails if the table has existing rows.

```sql
ALTER TABLE "users" ADD COLUMN "status" text NOT NULL;
```

#### Good

Add the column with a temporary default value, then remove it if needed.

**Migration 1:**

```sql
ALTER TABLE "users" ADD COLUMN "status" text NOT NULL DEFAULT 'active';
```

**Migration 2** (optional — remove the default after backfilling):

```sql
ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;
```

---

### Truncating a table

#### Bad

`TRUNCATE` acquires an `AccessExclusiveLock` and deletes all rows. Locks propagate to foreign-key-referencing tables, and accidental execution in production is catastrophic.

```sql
TRUNCATE TABLE "users";
```

#### Good

Delete rows in application code where scope is controlled:

```typescript
await prisma.users.deleteMany({});
```

---

### Disabling triggers

#### Bad

`DISABLE TRIGGER` turns off foreign key and other constraint triggers, which can silently corrupt data integrity. If the migration fails after disabling, triggers remain off.

```sql
ALTER TABLE "users" DISABLE TRIGGER ALL;
```

#### Good

Do not disable triggers in migrations. If unavoidable, always re-enable before the migration ends.

---

### Running VACUUM inside a migration

#### Bad

`VACUUM` cannot execute inside a transaction block. Prisma wraps migrations in `BEGIN/COMMIT`, so this always fails and marks the migration as broken.

```sql
VACUUM ANALYZE "users";
```

#### Good

Run VACUUM as a separate maintenance task outside migrations:

```bash
psql -c "VACUUM ANALYZE \"users\";"
```

---

### Moving a table to another tablespace

#### Bad

`SET TABLESPACE` physically relocates the table, holding an `AccessExclusiveLock` for the entire duration. On large tables this can block production for minutes.

```sql
ALTER TABLE "users" SET TABLESPACE pg_default;
```

#### Good

Run this operation in a scheduled maintenance window, not in a regular migration.

---

### Clustering a table

#### Bad

`CLUSTER` physically rewrites the table in index order, holding an `AccessExclusiveLock` throughout. On large tables this blocks all reads and writes for a long time.

```sql
CLUSTER "users" USING "users_pkey";
```

#### Good

Use **pg_repack** to reorder rows without an exclusive lock, or run `CLUSTER` during a low-traffic maintenance window.

---

### Creating a table from a SELECT query

#### Bad

`CREATE TABLE AS SELECT` copies all rows inside the migration. On large tables this takes a long time and can cause timeouts.

```sql
CREATE TABLE "users_backup" AS SELECT * FROM "users";
```

#### Good

Run data copies outside migrations using `pg_dump` or a separate backfill job.

---

### Keeping non-unique indexes to three columns or less

#### Bad

Adding a non-unique index with more than three columns rarely improves performance.

```sql
CREATE INDEX "users_multi_idx" ON "users"("a", "b", "c", "d");
```

#### Good

Start an index with columns that narrow down the results the most.

```sql
CREATE INDEX CONCURRENTLY "users_idx" ON "users"("d", "b");
```

---

### Using CONCURRENTLY without disabling the transaction

#### Bad

Prisma wraps every migration in a transaction. PostgreSQL does not allow `CONCURRENTLY` operations inside a transaction block, so the migration will fail at runtime.

```sql
CREATE INDEX CONCURRENTLY "idx_users_email" ON "users"("email");
```

#### Good

Add `-- prisma-migrate-disable-next-transaction` as the first line of the file and keep the file to one statement:

```sql
-- prisma-migrate-disable-next-transaction
CREATE INDEX CONCURRENTLY "idx_users_email" ON "users"("email");
```

---

### Adding NOT VALID and VALIDATE CONSTRAINT in the same file

#### Bad

`NOT VALID` is meant to defer the expensive table scan to a later `VALIDATE CONSTRAINT` step. Putting both in the same file negates the optimization — the full table scan still occurs.

```sql
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") NOT VALID;
ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_user_id_fkey";
```

#### Good

Split into two separate migration files:

```sql
-- migration_1.sql
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") NOT VALID;

-- migration_2.sql (deploy after migration_1)
ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_user_id_fkey";
```

---

### Multiple statements with disabled transaction

#### Bad

When `-- prisma-migrate-disable-next-transaction` is present, the whole file runs without a transaction. If any statement fails, earlier statements cannot be rolled back.

```sql
-- prisma-migrate-disable-next-transaction
CREATE INDEX CONCURRENTLY "idx_a" ON "users"("email");
ALTER TABLE "users" ADD COLUMN "name" text;
```

#### Good

Keep files with a disabled transaction to one SQL statement only:

```sql
-- prisma-migrate-disable-next-transaction
CREATE INDEX CONCURRENTLY "idx_a" ON "users"("email");
```

---

### UPDATE without WHERE clause

#### Bad

An `UPDATE` without a `WHERE` clause updates every row in the table, which can lock the table for a long time on large datasets.

```sql
UPDATE "users" SET "status" = 'active';
```

#### Good

Add a `WHERE` clause to limit the affected rows:

```sql
UPDATE "users" SET "status" = 'active' WHERE "status" IS NULL;
```

---

### DELETE FROM without WHERE clause

#### Bad

A `DELETE FROM` without a `WHERE` clause deletes every row in the table.

```sql
DELETE FROM "sessions";
```

#### Good

Add a `WHERE` clause to limit the deleted rows:

```sql
DELETE FROM "sessions" WHERE "expires_at" < NOW();
```

---

### Mixing schema changes and data backfill

#### Bad

Combining `ALTER TABLE` schema changes with `UPDATE` backfill in one migration can cause long-running locks on large tables.

```sql
ALTER TABLE "users" ADD COLUMN "full_name" text;
UPDATE "users" SET "full_name" = first_name || ' ' || last_name;
```

#### Good

Split into two separate migration files:

```sql
-- migration_1.sql: schema change only
ALTER TABLE "users" ADD COLUMN "full_name" text;

-- migration_2.sql: backfill only
UPDATE "users" SET "full_name" = first_name || ' ' || last_name;
```

---

### Removing an ENUM value

Prisma recreates the ENUM type when removing a value. If existing data contains the removed value, the migration will fail.

```sql
-- ❌ Bad: will fail if existing rows have the removed value
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";
DROP TYPE "Role_old";
```

```sql
-- ✅ Good: backfill data before removing the enum value
UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'MEMBER';
-- then apply the migration after deploying code that no longer references MEMBER
```

---

### Creating an implicit M2M join table

Prisma generates `_XToY` tables for implicit M2M relations. These tables are limited to columns `A` and `B`, cannot hold extra fields, and use opaque naming. Explicit M2M models are clearer and more flexible.

#### Bad

```sql
-- Prisma generates this for implicit M2M — columns A and B only
CREATE TABLE "_CategoryToPost" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);
```

#### Good

```prisma
-- ✅ Convert to explicit M2M in schema.prisma
model CategoryOnPost {
  post       Post     @relation(fields: [postId], references: [id])
  postId     Int
  category   Category @relation(fields: [categoryId], references: [id])
  categoryId Int
  assignedAt DateTime @default(now())

  @@id([postId, categoryId])
}
```

---

### Directly modifying an implicit M2M table

Prisma auto-manages join tables named `_AToB`. Direct modifications break Prisma's relation management.

```sql
-- ❌ Bad: bypasses Prisma's M2M management
ALTER TABLE "_CategoryToPost" ADD COLUMN "extra" TEXT;
```

```prisma
-- ✅ Good: convert to explicit M2M in schema.prisma
model CategoriesOnPosts {
  postId     Int
  categoryId Int
  post       Post     @relation(fields: [postId], references: [id])
  category   Category @relation(fields: [categoryId], references: [id])
  @@id([postId, categoryId])
}
```

---

### Using SERIAL (32-bit) for a primary key

`SERIAL` has a maximum of ~2.1 billion rows. Migrating to `BigInt` later is nearly impossible in production.

```sql
-- ❌ Bad: 32-bit integer, max ~2.1 billion rows
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    ...
);
```

```prisma
-- ✅ Good: use BigInt or UUID v7 in schema.prisma
model User {
  id BigInt @id @default(autoincrement())
  -- or
  id String @id @default(uuid(7))
}
```

---

### Dropping the default from an id column

Dropping a database-level default from the `id` column can break ID generation for inserts that bypass Prisma Client.

```sql
-- ❌ Bad: breaks ID generation if the column relies on a DB default
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;
```

```prisma
-- ✅ Good: change ID strategy in schema.prisma and let Prisma regenerate
model User {
  id String @id @default(uuid(7))
}
```

---

### Setting a DB-level default or trigger on @updatedAt

Prisma's `@updatedAt` manages the column automatically. Adding a DB-level default or trigger conflicts with Prisma's updates.

```sql
-- ❌ Bad: conflicts with Prisma's @updatedAt management
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

```prisma
-- ✅ Good: let Prisma manage it exclusively via @updatedAt
model User {
  updatedAt DateTime @updatedAt
}
```

---

## Skipping Checks

If you've reviewed the warning and want to proceed anyway, add a disable comment:

```sql
-- prisma-strong-migrations-disable-next-line removeColumn
-- Reason: Column deprecated, no references found
ALTER TABLE "users" DROP COLUMN "name";
```

### Skip multiple rules

```sql
-- prisma-strong-migrations-disable-next-line removeColumn renameColumn
ALTER TABLE "users" DROP COLUMN "name";
```

### Skip all rules for a statement

```sql
-- prisma-strong-migrations-disable-next-line
ALTER TABLE "users" DROP COLUMN "name";
```

## Configuration

Create `prisma-strong-migrations.config.js` in your project root:

```javascript
module.exports = {
  // Disable specific rules globally
  disabledRules: ["indexColumnsCount"],

  // Skip specific migrations
  ignoreMigrations: ["20240101_initial"],

  // Custom rules directory
  customRulesDir: "./prisma-strong-migrations-rules",
};
```

## Custom Rules

Create custom rules for your project-specific needs. See [docs/RULES.md](./docs/RULES.md) for details.

## CI Integration

See [docs/WORKFLOW.md](./docs/WORKFLOW.md) for CI/CD integration examples.

## Development

### Using devcontainer (Recommended)

This project uses Docker + devcontainer for development.

```bash
# Open in VSCode
# 1. Open the project in VSCode
# 2. Command Palette (Cmd+Shift+P) → "Dev Containers: Reopen in Container"
```

### Available Commands

```bash
vp install  # Install dependencies
vp test     # Run tests
vp check    # Run lint, format, and type checks
vp pack     # Build library for publishing
```

## Documentation

- [Design Document](./docs/DESIGN.md) - Architecture and implementation details
- [Rules Reference](./docs/RULES.md) - Detailed explanation of each rule
- [Testing Strategy](./docs/TESTING.md) - Unit and integration testing
- [Workflow Guide](./docs/WORKFLOW.md) - Development workflow and CI/CD
- [Agent Guidelines](./AGENTS.md) - Guidelines for AI agents

## Credits

Inspired by [strong_migrations](https://github.com/ankane/strong_migrations) by Andrew Kane.

## License

MIT
