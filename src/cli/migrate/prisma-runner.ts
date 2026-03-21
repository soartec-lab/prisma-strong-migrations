import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { check } from "../../checker";
import { consoleReport } from "../../reporter/console-reporter";
import { loadConfig } from "../../config/loader";
import { findMigrationFiles } from "../../find-migration-files";

export function findPrismaBin(): string {
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
