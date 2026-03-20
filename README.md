# strong-prisma

Catch unsafe Prisma migrations before they run. Detects dangerous operations like dropping columns, adding indexes without `CONCURRENTLY`, and more. Inspired by [strong_migrations](https://github.com/ankane/strong_migrations) for Rails.

## Installation

```bash
npm install --save-dev strong-prisma
```

## CLI Usage

Check all migrations in a Prisma migrations directory:

```bash
npx strong-prisma prisma/migrations
```

Check a specific migration file:

```bash
npx strong-prisma prisma/migrations/20240101000000_init/migration.sql
```

Check multiple files or directories:

```bash
npx strong-prisma path/to/migration1.sql path/to/migration2.sql
```

Exit code is `0` when no issues are found, and `1` when unsafe operations are detected — making it easy to use in CI pipelines.

## Programmatic API

```typescript
import {
  checkMigrationSql,
  checkMigrationFile,
  checkMigrationsDir,
} from "strong-prisma";

// Check SQL string directly
const result = checkMigrationSql(sqlString, "my-migration.sql");

// Check a file on disk
const result = checkMigrationFile("prisma/migrations/20240101_init/migration.sql");

// Check an entire migrations directory
const results = checkMigrationsDir("prisma/migrations");

// Inspect violations
for (const { filePath, violations } of results) {
  for (const v of violations) {
    console.log(`${filePath}:${v.line} [${v.check}] ${v.message}`);
  }
}
```

## Checks

| Check | Description |
|---|---|
| `drop_column` | Dropping a column can break live application code that still references it. |
| `drop_table` | Dropping a table can break live application code and is irreversible without a backup. |
| `add_index_without_concurrently` | `CREATE INDEX` without `CONCURRENTLY` acquires an exclusive lock on the table. Use `CREATE INDEX CONCURRENTLY`. |
| `add_column_not_null` | Adding a `NOT NULL` column without a `DEFAULT` causes a full table rewrite on older PostgreSQL versions. |
| `change_column_type` | Changing a column's type requires a full table rewrite in PostgreSQL for most conversions. |
| `rename_column` | Renaming a column breaks existing queries and application code immediately. |
| `rename_table` | Renaming a table breaks existing queries and application code immediately. |
| `set_not_null` | Setting `NOT NULL` on an existing column requires a full table scan and acquires a lock. |
| `add_unique_constraint` | Adding a `UNIQUE` constraint requires a full table scan and exclusive lock. Use `CREATE UNIQUE INDEX CONCURRENTLY` first. |

## Custom Checks

You can pass a custom set of checks to any of the API functions:

```typescript
import { checkMigrationSql, dropColumn, dropTable } from "strong-prisma";

// Run only specific checks
const result = checkMigrationSql(sql, "migration.sql", [dropColumn, dropTable]);
```

You can also implement your own checks by conforming to the `Check` interface:

```typescript
import type { Check } from "strong-prisma";

const myCheck: Check = {
  name: "no_truncate",
  detect(sql) {
    return /\bTRUNCATE\b/i.test(sql);
  },
  buildViolation(statement, line) {
    return {
      check: this.name,
      message: "TRUNCATE removes all rows and cannot be rolled back easily.",
      statement,
      line,
    };
  },
};
```

## CI Integration

Add to your GitHub Actions workflow:

```yaml
- name: Check for unsafe migrations
  run: npx strong-prisma prisma/migrations
```

Or as a `package.json` script:

```json
{
  "scripts": {
    "check-migrations": "strong-prisma prisma/migrations"
  }
}
```

## License

MIT

