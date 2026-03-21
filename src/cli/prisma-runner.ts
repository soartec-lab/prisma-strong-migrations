import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { check } from "../checker";
import { consoleReport } from "../reporter/console-reporter";
import { loadConfig } from "../config/loader";
import { findMigrationFiles } from "./find-migration-files";

function findPrismaBin(): string {
  const localPrisma = resolve(process.cwd(), "node_modules", ".bin", "prisma");
  if (existsSync(localPrisma)) return localPrisma;
  return "prisma";
}

export async function runCheckAndReport(
  migrationsDir: string,
  config: Awaited<ReturnType<typeof loadConfig>>,
  filePaths?: string[],
): Promise<boolean> {
  const files = filePaths ?? (await findMigrationFiles(migrationsDir));
  const allResults = [];

  for (const filePath of files) {
    const sql = await readFile(filePath, "utf-8");
    const results = await check({ sql, config, migrationPath: filePath });
    allResults.push(...results);
  }

  consoleReport(allResults);

  const hasErrors = allResults.some((r) => r.rule.severity === "error");
  const hasWarnings = allResults.some((r) => r.rule.severity === "warning");
  const failOnWarning = config.ci?.failOnWarning ?? false;

  return hasErrors || (failOnWarning && hasWarnings);
}

export function runPrisma(args: string[]): number {
  const result = spawnSync(findPrismaBin(), args, { stdio: "inherit" });
  return result.status ?? 1;
}

/**
 * Query the DB via `prisma db execute` and return the set of applied migration names.
 * Returns an empty Set on any error (DB unreachable, table missing, etc.) so the
 * caller can degrade gracefully.
 */
export function getAppliedMigrationNames(schemaPath?: string): Set<string> {
  const args = ["db", "execute", "--stdin"];

  if (schemaPath) {
    args.push("--schema", schemaPath);
  } else if (process.env.DATABASE_URL) {
    args.push("--url", process.env.DATABASE_URL);
  } else {
    const defaultSchema = resolve(process.cwd(), "prisma", "schema.prisma");
    if (existsSync(defaultSchema)) {
      args.push("--schema", defaultSchema);
    }
  }

  const sql =
    "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;";

  const result = spawnSync(findPrismaBin(), args, {
    input: sql,
    encoding: "utf-8",
  });

  if (result.status !== 0) return new Set();

  try {
    const rows: { migration_name: string }[] = JSON.parse(result.stdout);
    return new Set(rows.map((r) => r.migration_name));
  } catch {
    return new Set();
  }
}

/** Extract the Prisma migration name (parent directory) from a migration.sql path. */
export function migrationNameFromPath(filePath: string): string {
  return basename(dirname(filePath));
}
