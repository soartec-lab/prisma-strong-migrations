
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

=== ❌ Dangerous operation detected [SM001] ===

📍 Line 3: ALTER TABLE "users" DROP COLUMN "name"

❌ Bad: Removing a column may cause application errors

✅ Good: Follow these steps:
   1. Remove all usages of 'name' field from your code
   2. Run 'npx prisma generate' to update Prisma Client
   3. Deploy the code changes
   4. Then apply this migration

📚 More info: https://github.com/xxx/prisma-strong-migrations#removing-a-column

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line remove_column

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
-- prisma-strong-migrations-disable-next-line remove_column
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

| Type | Safe Changes |
|------|--------------|
| `varchar(n)` | Increasing or removing limit, changing to `text` |
| `text` | Changing to `varchar` with no limit |
| `numeric(p,s)` | Increasing precision at same scale |
| `timestamp` | Changing to `timestamptz` when session time zone is UTC |

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

Add indexes concurrently.

```sql
CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");
```

> **Note:** `CONCURRENTLY` cannot run inside a transaction. You need to manually edit the migration file generated by Prisma.

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

## Skipping Checks

If you've reviewed the warning and want to proceed anyway, add a disable comment:

```sql
-- prisma-strong-migrations-disable-next-line remove_column
-- Reason: Column deprecated, no references found
ALTER TABLE "users" DROP COLUMN "name";
```

### Skip multiple rules

```sql
-- prisma-strong-migrations-disable-next-line remove_column rename_column
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
  disabledRules: ['index_columns_count'],
  
  // Skip specific migrations
  ignoreMigrations: ['20240101_initial'],
  
  // Custom rules directory
  customRulesDir: './prisma-strong-migrations-rules',
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
