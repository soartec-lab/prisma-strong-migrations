# WriteMate — Example App

A sample blog platform to experience the real `prisma-strong-migrations` workflow:
edit a schema → generate a migration → see the safety error → fix it → apply.

---

## Schema

Three tables: `users`, `posts`, `comments`.

```
users    — id, email, name, created_at
posts    — id, title, body, user_id, published_at
comments — id, body, post_id, user_id, created_at
```

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create `.env`

```bash
cp .env.example .env
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Apply the initial migration

```bash
pnpm exec prisma migrate dev --name init
```

---

## Tutorial

### Scenario 1 — Add an index (the dangerous way)

#### Step 1: Edit the schema

Add `@@index([userId])` to the `Post` model in `prisma/schema.prisma`:

```prisma
model Post {
  // ...existing fields...

  @@index([userId])  // add this
  @@map("posts")
}
```

#### Step 2: Generate the migration and run the safety check

```bash
vp exec prisma-strong-migrations migrate dev --name add_index_posts_user_id
```

`prisma-strong-migrations migrate dev` creates the migration with `--create-only`,
runs the safety check automatically, and **stops before applying** if an error is found.

Expected output:

```
error [addIndex] prisma/migrations/.../migration.sql line 2
  Adding index "posts_user_id_idx" without CONCURRENTLY locks the table during creation.
```

#### Step 3: Fix the migration SQL

Open the generated `prisma/migrations/…/migration.sql` and edit it:

```sql
-- migrate:disable-transaction
-- CreateIndex
CREATE INDEX CONCURRENTLY "posts_user_id_idx" ON "posts"("user_id");
```

#### Step 4: Re-run the check — no errors

```bash
vp exec prisma-strong-migrations check
```

```
✓ 0 errors, 0 warnings
```

#### Step 5: Apply

```bash
pnpm exec prisma migrate dev
```

---

### Scenario 2 — Drop a column

#### Step 1: Edit the schema

Remove the `name` field from the `User` model.

#### Step 2: Generate the migration

```bash
vp exec prisma-strong-migrations migrate dev --name drop_users_name
```

Expected output:

```
error [removeColumn] prisma/migrations/.../migration.sql line 2
  Removing column "name" from table "users" may cause errors in a running application.
```

#### Step 3: Follow the suggested steps

Column removal cannot be auto-fixed — application code must be updated first:

```
✅ Safe approach:
   1. Remove all usages of the "name" field from application code
   2. Run "prisma generate" to update the Prisma Client
   3. Deploy the updated application code
   4. Then apply this migration
```

---

### Scenario 3 — Change a column type

#### Step 1: Edit the schema

Change `Post.body` from the default `TEXT` to `VARCHAR(255)`:

```prisma
model Post {
  body  String  @db.VarChar(255)
}
```

#### Step 2: Generate the migration

```bash
vp exec prisma-strong-migrations migrate dev --name change_posts_body_type
```

Expected output:

```
error [changeColumnType] prisma/migrations/.../migration.sql line 2
  Changing the type of column "body" on table "posts" may cause data loss or application errors.
```

---

## Useful commands

| Command                                                      | Description                                         |
| ------------------------------------------------------------ | --------------------------------------------------- |
| `docker compose up -d`                                       | Start PostgreSQL                                    |
| `docker compose down`                                        | Stop PostgreSQL                                     |
| `vp exec prisma-strong-migrations migrate dev --name <name>` | Generate migration → check → apply (stops on error) |
| `vp exec prisma-strong-migrations check`                     | Check all existing migrations                       |
| `vp exec prisma-strong-migrations check --fix`               | Auto-fix where possible (e.g. adds CONCURRENTLY)    |
| `vp exec prisma-strong-migrations check --format json`       | Output results as JSON                              |
| `pnpm exec prisma migrate dev`                               | Apply already-fixed migrations                      |

---

## Skipping a check

Add a disable comment directly above the statement to suppress a specific rule:

```sql
-- prisma-strong-migrations-disable-next-line addIndex
CREATE INDEX "posts_user_id_idx" ON "posts"("user_id");
```

Omit the rule name to suppress all rules for that statement:

```sql
-- prisma-strong-migrations-disable-next-line
CREATE INDEX "posts_user_id_idx" ON "posts"("user_id");
```
