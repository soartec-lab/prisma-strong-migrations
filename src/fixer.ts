import { writeFile } from "node:fs/promises";
import type { CheckResult } from "./rules/types";

export interface FixerResult {
  sql: string;
  appliedCount: number;
  skippedResults: CheckResult[];
}

/**
 * Apply auto-fixes to SQL content.
 * Rules that define a `fix` method are applied in order.
 * Rules without a `fix` method are returned in `skippedResults`.
 */
export function applyFixes(originalSql: string, results: CheckResult[]): FixerResult {
  const skippedResults: CheckResult[] = [];
  let sql = originalSql;
  let appliedCount = 0;
  let requiresDisableTransaction = false;

  for (const result of results) {
    const { rule, statement } = result;

    if (!rule.fix) {
      skippedResults.push(result);
      continue;
    }

    const fixResult = rule.fix(statement);

    // Normalize: strip trailing semicolon/whitespace from raw for text search
    const rawNormalized = statement.raw.replace(/;\s*$/, "").trim();

    const idx = sql.indexOf(rawNormalized);
    if (idx === -1) {
      // Statement not found (may have been modified by an earlier fix)
      skippedResults.push(result);
      continue;
    }

    // Find the end of the statement, including the optional trailing semicolon
    const afterRaw = idx + rawNormalized.length;
    const semiMatch = sql.slice(afterRaw).match(/^\s*;/);
    const endPos = semiMatch ? afterRaw + semiMatch[0].length : afterRaw;

    const fixedSql = fixResult.statements.join(";\n") + ";";
    sql = sql.slice(0, idx) + fixedSql + sql.slice(endPos);

    if (fixResult.requiresDisableTransaction) {
      requiresDisableTransaction = true;
    }
    appliedCount++;
  }

  // Add disable-transaction header if needed and not already present
  if (requiresDisableTransaction && !sql.includes("-- prisma-migrate-disable-next-transaction")) {
    sql = "-- prisma-migrate-disable-next-transaction\n" + sql;
  }

  return { sql, appliedCount, skippedResults };
}

export async function writeFixedSql(path: string, sql: string): Promise<void> {
  await writeFile(path, sql, "utf-8");
}
