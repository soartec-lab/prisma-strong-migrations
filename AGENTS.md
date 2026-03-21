# AGENTS.md - AI Agent Development Guidelines

This document provides guidelines for AI agents developing prisma-strong-migrations.

## Project Overview

prisma-strong-migrations is a CLI tool that detects dangerous operations in Prisma migrations.

## Development Environment

### Docker / devcontainer (Recommended)

This project uses Docker + devcontainer for development.

```bash
# Open devcontainer in VSCode
# 1. Open the project in VSCode
# 2. Command Palette (Cmd+Shift+P) → "Dev Containers: Reopen in Container"
```

The devcontainer includes:

- Node.js v25
- Vite+ (vp command)
- Git

### Environment Configuration Files

```
.devcontainer/
├── devcontainer.json  # devcontainer configuration
├── Dockerfile         # Container image definition
└── post-create.sh     # Initialization script
```

### Key Documentation

| Document                               | Content                                              |
| -------------------------------------- | ---------------------------------------------------- |
| [README.md](./README.md)               | Project overview, Bad/Good examples for all rules    |
| [docs/DESIGN.md](./docs/DESIGN.md)     | Architecture, directory structure, component details |
| [docs/RULES.md](./docs/RULES.md)       | Technical details of rules                           |
| [docs/TESTING.md](./docs/TESTING.md)   | Testing strategy                                     |
| [docs/WORKFLOW.md](./docs/WORKFLOW.md) | Development workflow                                 |

## Development Rules

### 1. Commit Rules (Most Important)

**Commit frequently with small changes.**

```bash
# ✅ Good: Small, focused commits
git add src/parser/sql-parser.ts
git commit -m "feat(parser): add SQL parser base implementation"

git add src/parser/sql-parser.test.ts
git commit -m "test(parser): add SQL parser unit tests"

# ❌ Bad: Large changes in a single commit
git add .
git commit -m "add parser and tests and rules"
```

#### When to Commit

- After implementing a single function → commit
- After adding tests → commit
- After fixing a bug → commit
- After updating documentation → commit

#### Installing New Libraries

Always separate library installation from the changes that use it.

```bash
# ✅ Good: Installation and fixes in separate commits
git add package.json pnpm-lock.yaml knip.json
git commit -m "chore: add knip for unused code detection"

git add src/...
git commit -m "fix: resolve knip findings"

# ❌ Bad: Installation and fixes in the same commit
git add .
git commit -m "add knip and fix unused exports"
```

#### Commit Message Format

```
<type>(<scope>): <description>

# Examples:
feat(parser): add SQL parser for ALTER TABLE statements
test(rules): add remove-column rule tests
fix(cli): handle missing migration directory
docs(readme): add installation instructions
refactor(checker): extract common validation logic
```

### 2. Directory Structure

```
prisma-strong-migrations/
├── src/
│   ├── index.ts               # Main exports
│   ├── cli.ts                 # CLI entry point
│   ├── checker.ts             # Check execution engine
│   ├── checker.test.ts        # ← Tests in same directory
│   │
│   ├── parser/
│   │   ├── index.ts
│   │   ├── sql-parser.ts
│   │   ├── sql-parser.test.ts # ← Tests in same directory
│   │   └── types.ts
│   │
│   ├── rules/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── loader.ts
│   │   └── builtin/           # Each rule in separate file
│   │       ├── remove-column.ts
│   │       ├── remove-column.test.ts
│   │       └── ...
│   │
│   ├── reporter/
│   │   ├── console-reporter.ts
│   │   └── json-reporter.ts
│   │
│   └── config/
│       └── types.ts
│
├── integration-tests/
│   ├── cases/                 # Test cases (SQL files + expected results)
│   │   ├── remove-column/
│   │   │   ├── migration.sql
│   │   │   ├── expected.json
│   │   │   └── README.md
│   │   └── ...
│   └── run-tests.ts
│
└── vite.config.ts             # Vite+ configuration
```

### 3. Development Toolchain

**Use Vite+.**

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

#### Running CLI Tools

**All CLI tools must be installed as `devDependencies` and executed via `vp exec`.**

```bash
# ✅ Good: install as devDependency, run via vp exec
vp add -D knip
vp exec knip

# ❌ Bad: run via npx (downloads on the fly, not reproducible)
npx knip
```

- `vp exec <tool>` — runs a binary from `node_modules/.bin` (equivalent to `pnpm exec`)
- `vp dlx <tool>` — runs without installing (use only for one-off exploration, not in CI or scripts)

### 4. Implementation Order

Follow this order for implementation:

#### Phase 1: Project Initialization

```bash
# 1. Create package.json
# 2. Create vite.config.ts
# 3. Create tsconfig.json
# 4. Install dependencies
```

**Commit example:**

```
feat: initialize project with vite-plus
```

#### Phase 2: Type Definitions

```bash
# 1. src/parser/types.ts - ParsedStatement type
# 2. src/rules/types.ts - Rule type, CheckContext type
# 3. src/config/types.ts - Config type
```

**Commit examples:**

```
feat(types): add ParsedStatement type
feat(types): add Rule and CheckContext types
feat(types): add Config type
```

#### Phase 3: SQL Parser

```bash
# 1. src/parser/sql-parser.ts - Base implementation
# 2. src/parser/sql-parser.test.ts - Tests
```

**Commit examples:**

```
feat(parser): add SQL parser base implementation
test(parser): add SQL parser tests for ALTER TABLE
feat(parser): add CREATE INDEX parsing
test(parser): add CREATE INDEX parsing tests
```

#### Phase 4: Rule Implementation

Implement each rule individually:

```bash
# 1. src/rules/builtin/remove-column.ts
# 2. src/rules/builtin/remove-column.test.ts
# 3. integration-tests/cases/remove-column/
```

**Commit examples:**

```
feat(rules): add remove_column rule
test(rules): add remove_column unit tests
test(integration): add remove_column test case
```

#### Phase 5: Checker

```bash
# 1. src/checker.ts
# 2. src/checker.test.ts
```

#### Phase 6: Reporter

```bash
# 1. src/reporter/console-reporter.ts
# 2. src/reporter/json-reporter.ts
```

#### Phase 7: CLI

```bash
# 1. src/cli.ts
```

### 5. Testing Rules

#### Unit Tests

- Place in the same directory as implementation files
- File naming: `*.test.ts`
- Write tests for each function

```typescript
// src/rules/builtin/remove-column.test.ts
import { describe, it, expect } from "vitest";
import { removeColumnRule } from "./remove-column";

describe("removeColumnRule", () => {
  describe("detect", () => {
    it("should detect DROP COLUMN statement", () => {
      // ...
    });

    it("should not detect ADD COLUMN statement", () => {
      // ...
    });
  });
});
```

#### Integration Tests

- Place in `integration-tests/cases/`
- Each case includes `migration.sql` + `expected.json` + `README.md`

```
integration-tests/cases/remove-column/
├── migration.sql      # SQL to test
├── expected.json      # Expected results
└── README.md          # Case description
```

### 6. Rule Implementation Template

```typescript
// src/rules/builtin/remove-column.ts
import { Rule, ParsedStatement } from "../types";

export const removeColumnRule: Rule = {
  name: "remove_column",
  severity: "error",
  description: "Removing a column may cause application errors",

  detect: (stmt: ParsedStatement): boolean => {
    return stmt.type === "alter_table" && stmt.action === "drop_column";
  },

  message: (stmt: ParsedStatement): string => {
    return `Removing column "${stmt.column}" from table "${stmt.table}" may cause errors`;
  },

  suggestion: (stmt: ParsedStatement): string => {
    return `
❌ Bad: Removing a column may cause application errors

✅ Good: Follow these steps:
   1. Remove all usages of '${stmt.column}' field from your code
   2. Run 'npx prisma generate' to update Prisma Client
   3. Deploy the code changes
   4. Then apply this migration

📚 More info: https://github.com/xxx/prisma-strong-migrations#removing-a-column

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line remove_column
    `.trim();
  },

  // fix is omitted (auto-fix not possible since application code changes are required)
};
```

### 6.5. `fix` Method (Auto-fix)

Rules can optionally implement a `fix` method.
When running with the `--fix` flag, rules that define `fix` will automatically rewrite SQL files.

#### When to implement `fix`

Only implement `fix` when all of the following are true:

1. **SQL-only** — No application code changes or human judgment required
2. **Deterministic transformation** — The correct SQL can be generated mechanically from the original
3. **Safer than the original** — The generated SQL is definitively safer (avoids locks, protects data)

#### Examples where `fix` should NOT be implemented

| Pattern                                                                              | Reason                                          |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Requires app code changes (`removeColumn`, `renameColumn`, `dropTable`, etc.)        | SQL fix alone is not safe to execute            |
| Requires human-supplied values (`updateWithoutWhere`, etc.)                          | Missing information cannot be inferred          |
| Correct solution is a schema.prisma change (`intPrimaryKey`, `implicitM2mTableChange`, etc.) | Rewriting SQL does not solve the root cause |
| Default value is context-dependent (`addNotNullWithoutDefault`, etc.)               | Appropriate value cannot be determined          |

#### Example `fix` implementation (auto-fixable rule)

```typescript
import type { FixResult } from "../types";

// Example fix implementation for the addIndex rule
fix: (stmt: ParsedStatement): FixResult => {
  // Generate SQL with CONCURRENTLY added
  const fixed = stmt.raw.replace(/CREATE INDEX/, "CREATE INDEX CONCURRENTLY");
  return {
    statements: [fixed],
    requiresDisableTransaction: true,
    note: "CONCURRENTLY cannot run inside a transaction. A disable-transaction header has been added at the top of the file.",
  };
},
```

#### Rules with auto-fix support

| Rule                  | Fix behavior                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `addIndex`            | `CREATE INDEX` → `CREATE INDEX CONCURRENTLY` + disable-transaction header                      |
| `removeIndex`         | `DROP INDEX` → `DROP INDEX CONCURRENTLY` + disable-transaction header                          |
| `addForeignKey`       | Add `NOT VALID` + append `VALIDATE CONSTRAINT` statement                                        |
| `addCheckConstraint`  | Add `NOT VALID` + append `VALIDATE CONSTRAINT` statement                                        |
| `setNotNull`          | Expand into 4 statements: CHECK NOT VALID → VALIDATE → SET NOT NULL → DROP CONSTRAINT          |
| `addUniqueConstraint` | Replace with `CREATE UNIQUE INDEX CONCURRENTLY` + `ADD CONSTRAINT USING INDEX` + header        |
| `addJsonColumn`       | Replace `json` with `jsonb` in the raw SQL                                                      |

See `.local-dev-docs/active/auto-fix-sql-proposal.md` for details.

### 7. Warning Skip Implementation

Skip warnings using SQL comments:

```sql
-- prisma-strong-migrations-disable-next-line remove_column
ALTER TABLE "users" DROP COLUMN "name";
```

Parser detection:

```typescript
const DISABLE_PATTERN = /--\s*prisma-strong-migrations-disable-next-line\s*([\w\s,]*)/;

function parseDisableComment(line: string): string[] | "all" {
  const match = line.match(DISABLE_PATTERN);
  if (!match) return [];

  const rules = match[1].trim();
  if (!rules) return "all";

  return rules.split(/[\s,]+/).filter(Boolean);
}
```

### 8. Error Handling

```typescript
// Custom error classes
export class ParseError extends Error {
  constructor(
    message: string,
    public line: number,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}
```

### 9. Dependencies

```json
{
  "dependencies": {
    "pgsql-ast-parser": "^12.0.0",
    "commander": "^11.0.0",
    "chalk": "^5.0.0"
  },
  "devDependencies": {
    "vite-plus": "latest",
    "@voidzero-dev/vite-plus-core": "latest",
    "typescript": "^5.0.0"
  }
}
```

### 10. Checklist

Checklist for implementing each feature:

- [ ] Create implementation file
- [ ] Commit
- [ ] Create unit tests
- [ ] Commit
- [ ] Create integration tests (if applicable)
- [ ] Commit
- [ ] Pass `vp check` (lint and type check)
- [ ] Pass `vp test`

## Rule List

Rules to implement:

| Name                     | Priority |
| ------------------------ | -------- |
| remove_column            | High     |
| rename_column            | High     |
| rename_table             | High     |
| change_column_type       | High     |
| add_index                | High     |
| remove_index             | Medium   |
| add_foreign_key          | High     |
| add_check_constraint     | Medium   |
| add_unique_constraint    | Medium   |
| add_exclusion_constraint | Low      |
| set_not_null             | High     |
| add_json_column          | Medium   |
| add_volatile_default     | Medium   |
| add_auto_increment       | Low      |
| add_stored_generated     | Low      |
| rename_schema            | Low      |
| index_columns_count      | Low      |

## FAQ

### Q: What if tests fail?

A: Fix the tests before committing. Do not commit with failing tests.

### Q: How to implement large features?

A: Break them into small steps and commit after each step.

### Q: How to update documentation?

A: Update documentation along with code changes, but as a separate commit.

```bash
git commit -m "feat(rules): add add_index rule"
git commit -m "docs(readme): add add_index rule documentation"
```
