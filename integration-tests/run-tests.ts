import { describe, it, expect } from "vite-plus/test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const CASES_DIR = join(import.meta.dirname, "cases");

interface ExpectedResult {
  results: Array<{
    ruleCode: string;
    line?: number;
  }>;
}

function loadCases(): Array<{ name: string; sqlPath: string; expectedPath: string }> {
  if (!existsSync(CASES_DIR)) return [];
  const cases: Array<{ name: string; sqlPath: string; expectedPath: string }> = [];

  for (const ruleName of readdirSync(CASES_DIR)) {
    const ruleDir = join(CASES_DIR, ruleName);
    for (const scenario of readdirSync(ruleDir)) {
      const scenarioDir = join(ruleDir, scenario);
      const sqlPath = join(scenarioDir, "migration.sql");
      const expectedPath = join(scenarioDir, "expected.json");
      if (existsSync(sqlPath) && existsSync(expectedPath)) {
        cases.push({ name: `${ruleName}/${scenario}`, sqlPath, expectedPath });
      }
    }
  }

  return cases;
}

const cases = loadCases();

if (cases.length === 0) {
  describe("integration", () => {
    it("no test cases yet", () => {
      expect(true).toBe(true);
    });
  });
} else {
  describe("integration", () => {
    for (const { name, sqlPath, expectedPath } of cases) {
      it(name, async () => {
        const sql = readFileSync(sqlPath, "utf-8");
        const expected: ExpectedResult = JSON.parse(readFileSync(expectedPath, "utf-8"));

        // Lazy import to avoid circular deps at module load time
        const { check } = await import("../src/checker");
        const { DEFAULT_CONFIG } = await import("../src/config/types");

        const results = await check({
          sql,
          config: DEFAULT_CONFIG,
          migrationPath: sqlPath,
        });

        expect(results.map((r) => ({ ruleCode: r.rule.code, line: r.statement.line }))).toEqual(
          expected.results,
        );
      });
    }
  });
}
