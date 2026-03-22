import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { check } from "../checker";
import { consoleReport } from "../reporter/console-reporter";
import { loadConfig } from "../config/loader";
import { findMigrationFiles } from "./find-migration-files";

function findPrismaBin(): string {
  let dir = process.cwd();
  // Walk up the directory tree to support pnpm/yarn workspaces where
  // node_modules/.bin lives at the workspace root, not in the package dir.
  while (true) {
    const bin = resolve(dir, "node_modules", ".bin", "prisma");
    if (existsSync(bin)) return bin;
    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return "prisma"; // fallback: rely on PATH
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
 * Run `prisma migrate status` and return the set of migration names that are
 * NOT yet applied (pending).  Prisma loads .env automatically, so DATABASE_URL
 * does not need to be in process.env.
 *
 * Returns null when the status cannot be determined (command failed, unexpected
 * output), so callers can fall back to checking all files.
 */
export function getPendingMigrationNames(schemaPath?: string): Set<string> | null {
  const args = ["migrate", "status"];
  if (schemaPath) args.push("--schema", schemaPath);

  const result = spawnSync(findPrismaBin(), args, { encoding: "utf-8" });

  // Exit 0 → "Database schema is up to date!" (nothing pending)
  if (result.status === 0) return new Set();

  // Exit 1 → has pending migrations OR an error
  const stdout = result.stdout ?? "";

  if (stdout.includes("Database schema is up to date")) return new Set();

  // Parse the list of pending migration names from output like:
  //   Following migration have not yet been applied:
  //   20230101000000_foo
  //   20230101000001_bar
  const pendingNames = new Set<string>();
  let inPendingSection = false;
  for (const raw of stdout.split("\n")) {
    const line = raw.trim();
    if (
      line.toLowerCase().includes("following migration") &&
      line.includes("not yet been applied")
    ) {
      inPendingSection = true;
      continue;
    }
    if (inPendingSection) {
      if (!line || line.startsWith("To apply")) {
        inPendingSection = false;
        continue;
      }
      pendingNames.add(line);
    }
  }

  return pendingNames.size > 0 ? pendingNames : null;
}

/** Extract the Prisma migration name (parent directory) from a migration.sql path. */
export function migrationNameFromPath(filePath: string): string {
  return basename(dirname(filePath));
}
