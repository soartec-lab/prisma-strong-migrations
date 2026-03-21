# prisma-strong-migrations Testing Strategy

This document explains the testing strategy for prisma-strong-migrations.

## Development Toolchain

This project uses [Vite+](https://github.com/voidzero-dev/vite-plus).

Vite+ is a development toolchain that integrates the following tools:

- **Vite** - Development server
- **Vitest** - Test runner
- **Oxlint** - Linter
- **Oxfmt** - Formatter
- **tsdown** - Library build

### Main Commands

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

## Types of Tests

This library uses two types of tests:

1. **Unit Tests** - Function-level tests for TypeScript source code
2. **Integration Tests** - E2E tests using actual SQL files

## 1. Unit Tests

### Placement Rules

**Implementation files and test files are placed in the same directory.**

```
src/
├── parser/
│   ├── sql-parser.ts          # Implementation
│   └── sql-parser.test.ts     # Test (same directory)
│
├── rules/
│   └── builtin/
│       ├── remove-column.ts       # Implementation
│       └── remove-column.test.ts  # Test (same directory)
```

### Rationale

- **Clear relationship**: Implementation and tests are adjacent, making the relationship obvious
- **Easy to maintain**: When moving files, tests move together
- **Easy to find**: No need to search for where tests are located

### Unit Test Example

```typescript
// src/rules/builtin/remove-column.test.ts
import { describe, it, expect } from "vitest";
import { removeColumnRule } from "./remove-column";
import { ParsedStatement } from "../types";

describe("removeColumnRule", () => {
  describe("detect", () => {
    it("should detect DROP COLUMN statement", () => {
      const stmt: ParsedStatement = {
        type: "alter_table",
        action: "drop_column",
        table: "users",
        column: "name",
        raw: 'ALTER TABLE "users" DROP COLUMN "name"',
        line: 1,
      };

      expect(removeColumnRule.detect(stmt, {} as any)).toBe(true);
    });

    it("should not detect ADD COLUMN statement", () => {
      const stmt: ParsedStatement = {
        type: "alter_table",
        action: "add_column",
        table: "users",
        column: "email",
        raw: 'ALTER TABLE "users" ADD COLUMN "email" text',
        line: 1,
      };

      expect(removeColumnRule.detect(stmt, {} as any)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include table and column names", () => {
      const stmt: ParsedStatement = {
        type: "alter_table",
        action: "drop_column",
        table: "users",
        column: "name",
        raw: 'ALTER TABLE "users" DROP COLUMN "name"',
        line: 1,
      };

      const message = removeColumnRule.message(stmt);

      expect(message).toContain("users");
      expect(message).toContain("name");
    });
  });
});
```

## 2. Integration Tests

### Purpose

- **Test real use cases**: Use actual SQL files
- **Serve as documentation**: Help users understand usage
- **Support debugging**: Use as reproduction cases when issues occur

### Directory Structure

```
integration-tests/
├── README.md                  # Test description and usage
├── run-tests.ts               # Test runner
│
├── cases/                     # Test cases
│   ├── remove-column/
│   │   ├── migration.sql      # SQL to test
│   │   ├── expected.json      # Expected detection results
│   │   └── README.md          # Case description
│   │
│   ├── remove-column-with-disable/
│   │   ├── migration.sql
│   │   ├── expected.json
│   │   └── README.md
│   │
│   └── ...
│
└── utils/
    └── test-helpers.ts
```

### Test Case Structure

Each test case consists of the following files:

#### migration.sql

SQL file to test. Same format as actual Prisma migrations.

```sql
-- integration-tests/cases/remove-column/migration.sql

-- This migration removes the 'name' column from the users table
ALTER TABLE "users" DROP COLUMN "name";
```

#### expected.json

Expected detection results.

```json
{
  "errors": [
    {
      "rule": "remove_column",
      "line": 3,
      "column": "name",
      "table": "users"
    }
  ],
  "warnings": []
}
```

#### README.md

Description of this test case.

```markdown
# remove-column

## Overview

Tests detection of column removal.

## Expected Behavior

- `remove_column` rule should be detected
- Should be reported as an error

## Related Rules

- remove_column
```

### Integration Test Examples

#### Basic Case

```
cases/remove-column/
├── migration.sql
├── expected.json
└── README.md
```

**migration.sql:**

```sql
ALTER TABLE "users" DROP COLUMN "name";
```

**expected.json:**

```json
{
  "errors": [
    {
      "rule": "remove_column",
      "line": 1
    }
  ],
  "warnings": []
}
```

#### Case with Disable Comment

```
cases/remove-column-with-disable/
├── migration.sql
├── expected.json
└── README.md
```

**migration.sql:**

```sql
-- prisma-strong-migrations-disable-next-line remove_column
ALTER TABLE "users" DROP COLUMN "name";
```

**expected.json:**

```json
{
  "errors": [],
  "warnings": []
}
```

#### Safe Case

```
cases/add-index-concurrent/
├── migration.sql
├── expected.json
└── README.md
```

**migration.sql:**

```sql
CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");
```

**expected.json:**

```json
{
  "errors": [],
  "warnings": []
}
```

#### Complex Case

```
cases/complex-migration/
├── migration.sql
├── expected.json
└── README.md
```

**migration.sql:**

```sql
-- Add new column (safe)
ALTER TABLE "users" ADD COLUMN "email" text;

-- Add index without CONCURRENTLY (dangerous)
CREATE INDEX "users_email_idx" ON "users"("email");

-- prisma-strong-migrations-disable-next-line remove_column
-- Remove old column (disabled)
ALTER TABLE "users" DROP COLUMN "old_email";
```

**expected.json:**

```json
{
  "errors": [
    {
      "rule": "add_index",
      "line": 5
    }
  ],
  "warnings": []
}
```

### Test Runner

```typescript
// integration-tests/run-tests.ts
import * as fs from "fs";
import * as path from "path";
import { check } from "../src/checker";

interface ExpectedResult {
  errors: Array<{
    rule: string;
    code: string;
    line?: number;
    table?: string;
    column?: string;
  }>;
  warnings: Array<{
    rule: string;
    code: string;
    line?: number;
  }>;
}

async function runTests() {
  const casesDir = path.join(__dirname, "cases");
  const cases = fs.readdirSync(casesDir);

  let passed = 0;
  let failed = 0;

  for (const caseName of cases) {
    const caseDir = path.join(casesDir, caseName);

    if (!fs.statSync(caseDir).isDirectory()) continue;

    const migrationPath = path.join(caseDir, "migration.sql");
    const expectedPath = path.join(caseDir, "expected.json");

    if (!fs.existsSync(migrationPath) || !fs.existsSync(expectedPath)) {
      console.warn(`⚠️  Skipping ${caseName}: missing files`);
      continue;
    }

    const sql = fs.readFileSync(migrationPath, "utf-8");
    const expected: ExpectedResult = JSON.parse(fs.readFileSync(expectedPath, "utf-8"));

    try {
      const result = await check(sql, { migrationPath });

      // Compare results
      const errorsMatch = compareResults(result.errors, expected.errors);
      const warningsMatch = compareResults(result.warnings, expected.warnings);

      if (errorsMatch && warningsMatch) {
        console.log(`✅ ${caseName}`);
        passed++;
      } else {
        console.log(`❌ ${caseName}`);
        console.log("   Expected:", JSON.stringify(expected, null, 2));
        console.log("   Actual:", JSON.stringify(result, null, 2));
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${caseName}: ${error}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

function compareResults(actual: any[], expected: any[]): boolean {
  if (actual.length !== expected.length) return false;

  for (const exp of expected) {
    const found = actual.some(
      (act) =>
        act.rule === exp.rule &&
        act.code === exp.code &&
        (exp.line === undefined || act.line === exp.line),
    );
    if (!found) return false;
  }

  return true;
}

runTests();
```

## Running Tests

Use Vite+ to run tests:

```bash
# Run all tests
vp test

# Watch mode
vp test --watch

# Test specific file
vp test src/rules/builtin/remove-column.test.ts

# Run only integration tests
vp test integration-tests/

# Coverage report
vp test --coverage
```

### Test Configuration in vite.config.ts

```typescript
import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: [
      "src/**/*.test.ts", // Unit tests
      "integration-tests/**/*.ts", // Integration tests
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
```

## Adding Test Cases

To add a new test case:

1. Create a new directory in `integration-tests/cases/`
2. Create `migration.sql` (SQL to test)
3. Create `expected.json` (expected results)
4. Create `README.md` (case description)

```bash
# Example: Add a new test case
mkdir integration-tests/cases/add-foreign-key-not-valid
cd integration-tests/cases/add-foreign-key-not-valid

# Create files
echo 'ALTER TABLE "posts" ADD CONSTRAINT "fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") NOT VALID;' > migration.sql
echo '{"errors": [], "warnings": []}' > expected.json
echo '# add-foreign-key-not-valid\n\nForeign key with NOT VALID is safe.' > README.md
```

## CI Execution

Use the official Vite+ GitHub Action [`setup-vp`](https://github.com/voidzero-dev/setup-vp):

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Vite+
        uses: voidzero-dev/setup-vp@v1
        with:
          node-version: "22"
          cache: true

      - name: Install dependencies
        run: vp install

      - name: Run checks (lint, format, type-check)
        run: vp check

      - name: Run tests
        run: vp test
```

## Test Coverage

### Coverage Goals

| Component | Target Coverage |
| --------- | --------------- |
| Parser    | 90%+            |
| Rules     | 95%+            |
| Checker   | 85%+            |
| CLI       | 70%+            |

### Viewing Coverage Report

```bash
# Generate coverage report
vp test --coverage

# Open HTML report
open coverage/index.html
```
