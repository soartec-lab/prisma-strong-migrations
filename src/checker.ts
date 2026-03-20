import * as fs from "fs";
import * as path from "path";
import { Check, CheckResult, Violation } from "./types";
import { parseStatements } from "./parser";
import * as defaultChecks from "./checks";

/** All built-in checks, in the order they are applied. */
export const ALL_CHECKS: Check[] = Object.values(defaultChecks);

/**
 * Checks a single SQL migration string for unsafe operations.
 *
 * @param sql      The full SQL content of the migration.
 * @param filePath An optional label used in the returned {@link CheckResult}.
 * @param checks   The set of checks to run (defaults to all built-in checks).
 */
export function checkMigrationSql(
  sql: string,
  filePath = "<unknown>",
  checks: Check[] = ALL_CHECKS,
): CheckResult {
  const violations: Violation[] = [];
  const statements = parseStatements(sql);

  for (const { sql: stmt, line } of statements) {
    for (const check of checks) {
      if (check.detect(stmt)) {
        violations.push(check.buildViolation(stmt, line));
      }
    }
  }

  return { filePath, violations };
}

/**
 * Checks a migration file on disk for unsafe operations.
 *
 * @param filePath Absolute or relative path to the `.sql` migration file.
 * @param checks   The set of checks to run (defaults to all built-in checks).
 */
export function checkMigrationFile(
  filePath: string,
  checks: Check[] = ALL_CHECKS,
): CheckResult {
  const absolutePath = path.resolve(filePath);
  const sql = fs.readFileSync(absolutePath, "utf8");
  return checkMigrationSql(sql, filePath, checks);
}

/**
 * Checks all `.sql` files found inside a Prisma migrations directory.
 *
 * The directory is traversed recursively so that it works with both the
 * flat `prisma/migrations/` layout and nested layouts.
 *
 * @param migrationsDir Path to the Prisma migrations directory.
 * @param checks        The set of checks to run (defaults to all built-in checks).
 */
export function checkMigrationsDir(
  migrationsDir: string,
  checks: Check[] = ALL_CHECKS,
): CheckResult[] {
  const absoluteDir = path.resolve(migrationsDir);
  const sqlFiles = collectSqlFiles(absoluteDir);
  return sqlFiles.map((f) => checkMigrationFile(f, checks));
}

/** Recursively collects all `.sql` files under a directory. */
function collectSqlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSqlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".sql")) {
      results.push(fullPath);
    }
  }
  return results.sort();
}
