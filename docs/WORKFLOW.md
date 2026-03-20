# prisma-strong-migrations Workflow

This document explains the actual development workflow using prisma-strong-migrations.

## Basic Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Modify schema.prisma                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Generate migration (without applying)                   │
│     npx prisma migrate dev --create-only --name xxx         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Safety check                                            │
│     npx prisma-strong-migrations check                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  Warnings?      │
                    └─────────────────┘
                     ↓ Yes          ↓ No
        ┌────────────────────┐    ┌────────────────────┐
        │ 4a. Review warning │    │ 4b. Apply          │
        │     Decide action  │    │     migration      │
        └────────────────────┘    └────────────────────┘
                     ↓
        ┌────────────────────┐
        │ 5. Take action     │
        │    - Staged migration │
        │    - Add comment   │
        └────────────────────┘
                     ↓
        ┌────────────────────┐
        │ 6. Re-check        │
        │    → Pass          │
        └────────────────────┘
                     ↓
        ┌────────────────────┐
        │ 7. Apply           │
        │    migration       │
        └────────────────────┘
```

## Handling Warnings

When a warning is issued, there are two approaches:

### Approach 1: Staged Migration (Recommended)

Follow the warning instructions to perform the migration safely.

#### Example: Column Removal

**Warning:**
```
=== ❌ Dangerous operation detected [SM001] ===

📍 Line 1: ALTER TABLE "users" DROP COLUMN "name"

Removing a column may cause errors in your application.

💡 Recommended approach:
   1. Remove all usages of 'name' field from your code
   2. Run 'npx prisma generate' to update Prisma Client
   3. Deploy the code changes
   4. Then apply this migration
```

**Action:**

1. Remove references to `name` field from application code
2. Run `npx prisma generate`
3. Deploy code changes
4. Apply the migration

```bash
# After code changes, apply migration
npx prisma migrate dev
```

### Approach 2: Skip After Review

If you understand the risks and want to proceed, add a comment.

#### Comment Format

```sql
-- prisma-strong-migrations-disable-next-line <rule_name>
-- Reason: <reason>
<SQL statement>
```

#### Example

```sql
-- prisma-strong-migrations-disable-next-line remove_column
-- Reason: This is a new table with no production data yet
ALTER TABLE "temp_users" DROP COLUMN "name";
```

#### Skip Multiple Rules

```sql
-- prisma-strong-migrations-disable-next-line remove_column rename_column
-- Reason: Refactoring unused legacy table
ALTER TABLE "legacy_users" DROP COLUMN "old_name";
```

#### Skip All Rules

```sql
-- prisma-strong-migrations-disable-next-line
-- Reason: Emergency hotfix, reviewed by @senior-dev
ALTER TABLE "users" DROP COLUMN "name";
```

## Specific Scenarios

### Scenario 1: Column Removal

```bash
# 1. Remove field from schema.prisma
# model User {
#   id    Int    @id
#   // name  String  ← removed
#   email String
# }

# 2. Generate migration
npx prisma migrate dev --create-only --name remove_user_name

# 3. Check
npx prisma-strong-migrations check
# → SM001 remove_column warning

# 4. Choose approach
#    A) Staged migration: Remove references from code → Deploy → Migration
#    B) Skip: Add comment

# For 4B: Add comment
cat >> prisma/migrations/20240320_remove_user_name/migration.sql << 'EOF'
-- prisma-strong-migrations-disable-next-line remove_column
-- Reason: Field unused, confirmed no references in codebase (grep -r "user.name" returned 0 results)
EOF

# 5. Re-check
npx prisma-strong-migrations check
# → Pass

# 6. Apply migration
npx prisma migrate dev
```

### Scenario 2: Adding Index

```bash
# 1. Add index to schema.prisma
# model User {
#   id    Int    @id
#   email String
#   @@index([email])  ← added
# }

# 2. Generate migration
npx prisma migrate dev --create-only --name add_user_email_index

# 3. Check
npx prisma-strong-migrations check
# → SM005 add_index warning (non-CONCURRENTLY)

# 4. Manually edit migration.sql
vim prisma/migrations/20240320_add_user_email_index/migration.sql

# Before:
# CREATE INDEX "User_email_idx" ON "User"("email");

# After:
# CREATE INDEX CONCURRENTLY "User_email_idx" ON "User"("email");

# 5. Re-check
npx prisma-strong-migrations check
# → Pass

# 6. Apply migration
npx prisma migrate dev
```

### Scenario 3: Adding Foreign Key

```bash
# 1. Add relation to schema.prisma
# model Post {
#   id       Int  @id
#   userId   Int
#   user     User @relation(fields: [userId], references: [id])  ← added
# }

# 2. Generate migration
npx prisma migrate dev --create-only --name add_post_user_fk

# 3. Check
npx prisma-strong-migrations check
# → SM007 add_foreign_key warning (no NOT VALID)

# 4. Manually edit migration.sql and split into two migrations

# Migration 1: prisma/migrations/20240320_add_post_user_fk/migration.sql
# ALTER TABLE "Post"
# ADD CONSTRAINT "Post_userId_fkey"
# FOREIGN KEY ("userId") REFERENCES "User"("id")
# NOT VALID;

# Migration 2: prisma/migrations/20240321_validate_post_user_fk/migration.sql
# ALTER TABLE "Post"
# VALIDATE CONSTRAINT "Post_userId_fkey";

# 5. Re-check
npx prisma-strong-migrations check
# → Pass

# 6. Apply migration
npx prisma migrate dev
```

## CI/CD Usage

### GitHub Actions

```yaml
name: Migration Check

on:
  pull_request:
    paths:
      - 'prisma/schema.prisma'
      - 'prisma/migrations/**'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Vite+
        uses: voidzero-dev/setup-vp@v1
        with:
          node-version: '22'
          cache: true
          
      - name: Install dependencies
        run: vp install
        
      - name: Check migrations
        run: npx prisma-strong-migrations check
```

### PR Warning Display

When check fails, you can also add a comment to the PR:

```yaml
      - name: Check migrations
        id: check
        run: |
          npx prisma-strong-migrations check --format json > report.json
          echo "result=$(cat report.json)" >> $GITHUB_OUTPUT
        continue-on-error: true
        
      - name: Comment on PR
        if: steps.check.outcome == 'failure'
        uses: actions/github-script@v7
        with:
          script: |
            const report = JSON.parse('${{ steps.check.outputs.result }}');
            const body = `## ⚠️ Migration Safety Check Failed
            
            ${report.errors.map(e => `- **${e.code}**: ${e.message}`).join('\n')}
            
            Please review the warnings and either:
            1. Follow the recommended safe approach
            2. Add a disable comment with a reason
            `;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

## Best Practices

### 1. Always Use `--create-only`

```bash
# ✅ Good: Separate generation and application
npx prisma migrate dev --create-only --name xxx
npx prisma-strong-migrations check
npx prisma migrate dev

# ❌ Bad: Direct application (cannot check)
npx prisma migrate dev --name xxx
```

### 2. Always Include Reason in Comments

```sql
-- ✅ Good: Clear reason
-- prisma-strong-migrations-disable-next-line remove_column
-- Reason: Column deprecated in v2.0, no references found (verified with grep)
ALTER TABLE "users" DROP COLUMN "legacy_field";

-- ❌ Bad: No reason
-- prisma-strong-migrations-disable-next-line remove_column
ALTER TABLE "users" DROP COLUMN "legacy_field";
```

### 3. Prefer Staged Migration

Prioritize using the recommended safe approach over skipping warnings.

### 4. Share Rules with Team

Commit `prisma-strong-migrations.config.js` to the repository so the entire team uses the same rules.

```javascript
// prisma-strong-migrations.config.js
module.exports = {
  // Project-specific settings
  customRulesDir: './prisma-strong-migrations-rules',
};
```

## Troubleshooting

### Check Fails in CI but Passes Locally

1. Ensure the same Node.js version is used
2. Check if config file is committed
3. Verify migration files are committed

### Parser Errors

If the SQL parser fails:

1. Check if the SQL syntax is valid
2. Some PostgreSQL-specific syntax may not be supported
3. Report issues with the SQL that failed

### False Positives

If a warning is incorrect:

1. Check if the rule is appropriate for your use case
2. Consider disabling the rule in config
3. Report as an issue if it's a bug
