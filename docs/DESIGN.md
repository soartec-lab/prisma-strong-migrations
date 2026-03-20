# prisma-strong-migrations Design Document

## Overview

prisma-strong-migrations is a CLI tool that detects dangerous operations in Prisma migrations before execution and provides safe alternatives.

Inspired by [strong_migrations](https://github.com/ankane/strong_migrations) for Ruby on Rails.

## Background and Purpose

### Problem

When you modify your schema in Prisma, the `prisma migrate dev` command auto-generates SQL migrations. However, the generated SQL may contain dangerous operations such as:

1. **Application errors due to deployment order**
   - Column removal: If migration is applied first, old application code will error
   - Table/column renaming: Similar deployment order issues
   - Rolling deployments may cause errors on some servers
   
   > **Note**: Unlike Rails, Prisma does not cache schema at runtime.
   > However, errors can still occur during deployment timing or rollbacks.

2. **Operations that lock the database**
   - Adding indexes without CONCURRENTLY (PostgreSQL)
   - Adding NOT NULL constraints
   - Adding foreign key constraints

3. **Operations that cause full table rewrites**
   - Changing column types
   - Adding volatile default values

### Solution

Analyze SQL before migration execution, detect dangerous operations, and warn developers.

## Architecture

### Overall Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                           │
│  (commander.js)                                             │
├─────────────────────────────────────────────────────────────┤
│                       Checker Engine                        │
│  - Load migration files                                     │
│  - Execute rules                                            │
│  - Aggregate results                                        │
├─────────────────────────────────────────────────────────────┤
│                        SQL Parser                           │
│  (pgsql-ast-parser)                                         │
│  - Convert SQL to AST (Abstract Syntax Tree)                │
│  - Identify statement types                                 │
├─────────────────────────────────────────────────────────────┤
│                      Rules Engine                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Built-in    │  │ Built-in    │  │ Custom      │         │
│  │ Rule 1      │  │ Rule 2...   │  │ Rules       │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                        Reporter                             │
│  - Console output                                           │
│  - JSON output (for CI)                                     │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
prisma-strong-migrations/
├── package.json
├── tsconfig.json
├── README.md
├── docs/
│   ├── DESIGN.md              # This design document
│   └── RULES.md               # Rule list and details
│
├── src/
│   ├── index.ts               # Main exports
│   ├── cli.ts                 # CLI entry point
│   ├── checker.ts             # Check execution engine
│   ├── checker.test.ts        # ← Unit test (same directory)
│   │
│   ├── parser/
│   │   ├── index.ts
│   │   ├── sql-parser.ts
│   │   ├── sql-parser.test.ts # ← Unit test
│   │   └── types.ts
│   │
│   ├── rules/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── loader.ts
│   │   ├── loader.test.ts     # ← Unit test
│   │   │
│   │   └── builtin/           # Built-in rules (individual files)
│   │       ├── index.ts
│   │       ├── remove-column.ts
│   │       ├── remove-column.test.ts      # ← Unit test
│   │       ├── rename-column.ts
│   │       ├── rename-column.test.ts
│   │       ├── rename-table.ts
│   │       ├── rename-table.test.ts
│   │       ├── change-column-type.ts
│   │       ├── change-column-type.test.ts
│   │       ├── add-index.ts
│   │       ├── add-index.test.ts
│   │       ├── ... (other rules follow same pattern)
│   │       └── index-columns-count.ts
│   │
│   ├── reporter/
│   │   ├── index.ts
│   │   ├── console-reporter.ts
│   │   ├── console-reporter.test.ts
│   │   └── json-reporter.ts
│   │
│   └── config/
│       ├── index.ts
│       └── types.ts
│
├── integration-tests/          # Integration tests
│   ├── README.md              # Test description and usage
│   ├── run-tests.ts           # Test runner
│   │
│   ├── cases/                 # Test cases (SQL files + expected results)
│   │   ├── remove-column/
│   │   │   ├── migration.sql          # SQL to test
│   │   │   ├── expected.json          # Expected detection results
│   │   │   └── README.md              # Case description
│   │   │
│   │   ├── remove-column-with-disable/
│   │   │   ├── migration.sql          # With disable comment
│   │   │   ├── expected.json          # Expect no warnings
│   │   │   └── README.md
│   │   │
│   │   ├── add-index-non-concurrent/
│   │   │   ├── migration.sql
│   │   │   ├── expected.json
│   │   │   └── README.md
│   │   │
│   │   ├── add-index-concurrent/
│   │   │   ├── migration.sql          # With CONCURRENTLY (safe)
│   │   │   ├── expected.json          # Expect no warnings
│   │   │   └── README.md
│   │   │
│   │   ├── complex-migration/         # Multiple operations
│   │   │   ├── migration.sql
│   │   │   ├── expected.json
│   │   │   └── README.md
│   │   │
│   │   └── real-world-examples/       # Real-world use cases
│   │       ├── add-user-profile/
│   │       ├── rename-legacy-columns/
│   │       └── ...
│   │
│   └── utils/
│       └── test-helpers.ts
│
├── templates/
│   └── custom-rule.js
│
└── examples/
    ├── prisma-strong-migrations.config.js
    └── custom-rules/
        └── require-index-on-uuid.js
```

## Component Details

### 1. CLI Layer (`src/cli.ts`)

```typescript
import { Command } from 'commander';

const program = new Command();

program
  .name('prisma-strong-migrations')
  .description('Catch unsafe Prisma migrations before they run')
  .version('1.0.0');

program
  .command('check [migration]')
  .description('Check migrations for dangerous operations')
  .option('-f, --format <format>', 'Output format (console|json)', 'console')
  .option('-c, --config <path>', 'Path to config file')
  .option('--no-fail', 'Do not exit with error code on issues')
  .action(async (migration, options) => {
    // Execute check
  });

program
  .command('init')
  .description('Create a config file')
  .action(() => {
    // Generate config file
  });

program
  .command('init-rule <name>')
  .description('Create a custom rule template')
  .action((name) => {
    // Generate custom rule template
  });
```

### 2. SQL Parser (`src/parser/sql-parser.ts`)

```typescript
import { parse } from 'pgsql-ast-parser';

export interface ParsedStatement {
  type: StatementType;
  raw: string;
  line: number;
  
  // For ALTER TABLE
  table?: string;
  action?: AlterAction;
  column?: string;
  dataType?: string;
  
  // For CREATE INDEX
  indexName?: string;
  columns?: string[];
  concurrently?: boolean;
  unique?: boolean;
  
  // For constraints
  constraintName?: string;
  constraintType?: ConstraintType;
  notValid?: boolean;
}

export type StatementType = 
  | 'alter_table'
  | 'create_index'
  | 'drop_index'
  | 'create_table'
  | 'drop_table'
  | 'alter_schema'
  | 'unknown';

export type AlterAction =
  | 'add_column'
  | 'drop_column'
  | 'rename_column'
  | 'alter_column_type'
  | 'alter_column_set_not_null'
  | 'alter_column_set_default'
  | 'add_constraint'
  | 'rename_table';

export function parseMigration(sql: string): ParsedStatement[] {
  const ast = parse(sql);
  return ast.map(stmt => transformStatement(stmt));
}
```

### 3. Rules Engine (`src/rules/types.ts`)

```typescript
export interface Rule {
  /** Unique identifier for the rule */
  name: string;
  
  /** Error code (e.g., SM001) */
  code: string;
  
  /** Severity level */
  severity: 'error' | 'warning';
  
  /** Rule description */
  description: string;
  
  /** 
   * Check if a statement violates this rule
   * @param statement Parsed SQL statement
   * @param context Full migration context
   * @returns true if violation detected
   */
  detect: (statement: ParsedStatement, context: CheckContext) => boolean;
  
  /**
   * Generate error message for violation
   */
  message: (statement: ParsedStatement) => string;
  
  /**
   * Provide safe alternative
   */
  suggestion: (statement: ParsedStatement) => string;
}

export interface CheckContext {
  /** All statements in the migration */
  statements: ParsedStatement[];
  
  /** Migration file path */
  migrationPath: string;
  
  /** Configuration */
  config: Config;
}

export interface CheckResult {
  rule: Rule;
  statement: ParsedStatement;
  message: string;
  suggestion: string;
}
```

### 4. Rule Implementation Example (`src/rules/builtin/remove-column.ts`)

```typescript
import { Rule, ParsedStatement } from '../types';

export const removeColumnRule: Rule = {
  name: 'remove_column',
  code: 'SM001',
  severity: 'error',
  description: 'Removing a column may cause application errors',
  
  detect: (stmt: ParsedStatement): boolean => {
    return stmt.type === 'alter_table' && 
           stmt.action === 'drop_column';
  },
  
  message: (stmt: ParsedStatement): string => {
    return `Removing column "${stmt.column}" from table "${stmt.table}" may cause errors in your application. Prisma Client still references this column until you regenerate it.`;
  },
  
  suggestion: (stmt: ParsedStatement): string => {
    return `
## Safe approach for removing column "${stmt.column}"

1. **Remove all usages** of the '${stmt.column}' field from your application code

2. **Update Prisma Client**
   \`\`\`bash
   npx prisma generate
   \`\`\`

3. **Deploy the code changes** to production

4. **Then apply this migration**
   \`\`\`bash
   npx prisma migrate deploy
   \`\`\`

To skip this check, add above the statement:
\`\`\`sql
-- prisma-strong-migrations-disable-next-line remove_column
ALTER TABLE "${stmt.table}" DROP COLUMN "${stmt.column}";
\`\`\`
    `.trim();
  }
};
```

### 5. Custom Rule Loader (`src/rules/loader.ts`)

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { Rule } from './types';

export async function loadCustomRules(dir: string): Promise<Rule[]> {
  const rules: Rule[] = [];
  
  if (!fs.existsSync(dir)) {
    return rules;
  }
  
  const files = fs.readdirSync(dir).filter(f => 
    f.endsWith('.js') || f.endsWith('.ts')
  );
  
  for (const file of files) {
    const rulePath = path.join(dir, file);
    const ruleModule = await import(rulePath);
    const rule = ruleModule.default || ruleModule;
    
    validateRule(rule);
    rules.push(rule);
  }
  
  return rules;
}

function validateRule(rule: unknown): asserts rule is Rule {
  if (!rule || typeof rule !== 'object') {
    throw new Error('Rule must be an object');
  }
  
  const r = rule as Record<string, unknown>;
  
  if (typeof r.name !== 'string') {
    throw new Error('Rule must have a name');
  }
  if (typeof r.detect !== 'function') {
    throw new Error('Rule must have a detect function');
  }
  // ... other validations
}
```

### 6. Configuration File (`src/config/types.ts`)

```typescript
export interface Config {
  /** Rules to disable */
  disabledRules?: string[];
  
  /** Migrations to skip (patterns) */
  ignoreMigrations?: string[];
  
  /** Custom rules directory */
  customRulesDir?: string;
  
  /** Inline custom rules */
  customRules?: Rule[];
  
  /** Promote warnings to errors */
  warningsAsErrors?: boolean;
  
  /** CI settings */
  ci?: {
    failOnWarning?: boolean;
    failOnError?: boolean;
  };
  
  /** Prisma migrations directory */
  migrationsDir?: string;
}

export const defaultConfig: Config = {
  disabledRules: [],
  ignoreMigrations: [],
  customRulesDir: './prisma-strong-migrations-rules',
  migrationsDir: './prisma/migrations',
  ci: {
    failOnWarning: false,
    failOnError: true,
  }
};
```

## Rule List

### Dangerous Operations (Error)

| Code | Name | Detection Pattern | Reason |
|------|------|-------------------|--------|
| SM001 | `remove_column` | `DROP COLUMN` | Application errors |
| SM002 | `rename_column` | `RENAME COLUMN` | Application errors |
| SM003 | `rename_table` | `RENAME TO` (table) | Application errors |
| SM004 | `change_column_type` | `ALTER COLUMN ... TYPE` | Table rewrite |
| SM005 | `add_index` | `CREATE INDEX` (non-CONCURRENTLY) | Write blocking |
| SM006 | `remove_index` | `DROP INDEX` (non-CONCURRENTLY) | Write blocking |
| SM007 | `add_foreign_key` | `ADD CONSTRAINT ... FOREIGN KEY` (non-NOT VALID) | Both tables locked |
| SM008 | `add_check_constraint` | `ADD CONSTRAINT ... CHECK` (non-NOT VALID) | Full row check |
| SM009 | `add_unique_constraint` | `ADD CONSTRAINT ... UNIQUE` | Read/write blocking |
| SM010 | `add_exclusion_constraint` | `ADD CONSTRAINT ... EXCLUDE` | Full row check |
| SM011 | `set_not_null` | `SET NOT NULL` | Full row check |
| SM012 | `add_json_column` | `ADD COLUMN ... json` | No equality operator |
| SM013 | `add_volatile_default` | `DEFAULT gen_random_uuid()` etc. | Table rewrite |
| SM014 | `add_auto_increment` | `SERIAL`, `BIGSERIAL` | Table rewrite |
| SM015 | `add_stored_generated` | `GENERATED ALWAYS AS ... STORED` | Table rewrite |
| SM016 | `rename_schema` | `ALTER SCHEMA ... RENAME` | Application errors |
| SM017 | `create_table_force` | `DROP TABLE IF EXISTS` + `CREATE TABLE` | Data loss |

### Best Practices (Warning)

| Code | Name | Detection Pattern | Reason |
|------|------|-------------------|--------|
| SM101 | `index_columns_count` | Non-unique index with 4+ columns | Performance |

## Skipping Warnings

When you've reviewed a warning and intentionally want to perform a dangerous operation, use **inline comments**.

### Basic Usage

```sql
-- prisma-strong-migrations-disable-next-line remove_column
ALTER TABLE "users" DROP COLUMN "name";
```

### Skip Multiple Rules

```sql
-- prisma-strong-migrations-disable-next-line remove_column rename_column
ALTER TABLE "users" DROP COLUMN "name";
```

### Skip All Rules

```sql
-- prisma-strong-migrations-disable-next-line
ALTER TABLE "users" DROP COLUMN "name";
```

### Why Inline Comments?

1. **Prisma migration files are not regenerated** - Once created, migration SQL files are not modified by Prisma
2. **Explicit intent** - Clearly shows the developer reviewed and approved the operation
3. **Version controlled** - Approval is tracked in git history
4. **No separate approval files** - Simpler than maintaining separate approval files

## Development Toolchain

This project uses **Vite+** for development.

### Available Commands

```bash
# Install dependencies
vp install

# Run tests
vp test

# Lint, format, and type check
vp check

# Build library
vp pack
```

### Vite+ Components

- **Vitest** - Test runner
- **Oxlint** - Linter
- **Oxfmt** - Formatter
- **tsdown** - Build tool

## Testing Strategy

### Unit Tests

- Place in the same directory as implementation files
- File naming: `*.test.ts`
- Test each function individually

### Integration Tests

- Place in `integration-tests/cases/`
- Each case includes:
  - `migration.sql` - SQL to test
  - `expected.json` - Expected results
  - `README.md` - Case description

### Test Execution

```bash
# Run all tests
vp test

# Run specific test file
vp test src/rules/builtin/remove-column.test.ts

# Run with coverage
vp test --coverage
```
