import { describe, it, expect } from "vitest";
import { check } from "./checker";
import type { Config } from "./config/types";
import type { Rule } from "./rules/types";
import type { ParsedStatement, CheckContext } from "./rules/types";

const baseConfig: Config = {
  disabledRules: [],
  customRules: [],
};

describe("check", () => {
  it("should return empty results for empty SQL", async () => {
    const results = await check({
      sql: "",
      config: baseConfig,
      migrationPath: "migration.sql",
    });
    expect(results).toEqual([]);
  });

  it("should return empty results when no rules are violated", async () => {
    const results = await check({
      sql: 'ALTER TABLE "users" ADD COLUMN "age" integer;',
      config: baseConfig,
      migrationPath: "migration.sql",
    });
    expect(results).toEqual([]);
  });

  it("should detect remove_column violation", async () => {
    const results = await check({
      sql: 'ALTER TABLE "users" DROP COLUMN "name";',
      config: baseConfig,
      migrationPath: "migration.sql",
    });
    expect(results).toHaveLength(1);
    expect(results[0].rule.name).toBe("remove_column");
    expect(results[0].rule.severity).toBe("error");
    expect(results[0].statement.table).toBe("users");
    expect(results[0].statement.column).toBe("name");
  });

  it("should detect multiple violations in one SQL", async () => {
    const sql = `
      ALTER TABLE "users" DROP COLUMN "name";
      ALTER TABLE "posts" DROP COLUMN "title";
    `;
    const results = await check({ sql, config: baseConfig, migrationPath: "migration.sql" });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.rule.name === "remove_column")).toBe(true);
  });

  it("should skip globally disabled rules", async () => {
    const results = await check({
      sql: 'ALTER TABLE "users" DROP COLUMN "name";',
      config: { ...baseConfig, disabledRules: ["remove_column"] },
      migrationPath: "migration.sql",
    });
    expect(results).toEqual([]);
  });

  it("should not skip rules not in disabledRules", async () => {
    const results = await check({
      sql: 'ALTER TABLE "users" DROP COLUMN "name";',
      config: { ...baseConfig, disabledRules: ["rename_column"] },
      migrationPath: "migration.sql",
    });
    expect(results).toHaveLength(1);
  });

  it("should handle disable-next-line comment for specific rule", async () => {
    const sql = `
-- prisma-strong-migrations-disable-next-line remove_column
ALTER TABLE "users" DROP COLUMN "name";
    `;
    const results = await check({ sql, config: baseConfig, migrationPath: "migration.sql" });
    expect(results).toEqual([]);
  });

  it("should handle disable-next-line comment for all rules", async () => {
    const sql = `
-- prisma-strong-migrations-disable-next-line
ALTER TABLE "users" DROP COLUMN "name";
    `;
    const results = await check({ sql, config: baseConfig, migrationPath: "migration.sql" });
    expect(results).toEqual([]);
  });

  it("should not skip rule when disable comment names different rule", async () => {
    const sql = `
-- prisma-strong-migrations-disable-next-line rename_column
ALTER TABLE "users" DROP COLUMN "name";
    `;
    const results = await check({ sql, config: baseConfig, migrationPath: "migration.sql" });
    expect(results).toHaveLength(1);
    expect(results[0].rule.name).toBe("remove_column");
  });

  it("should include message and suggestion in results", async () => {
    const results = await check({
      sql: 'ALTER TABLE "users" DROP COLUMN "name";',
      config: baseConfig,
      migrationPath: "migration.sql",
    });
    expect(results[0].message).toBeTruthy();
    expect(results[0].suggestion).toBeTruthy();
  });

  it("should apply custom rules", async () => {
    const customRule: Rule = {
      name: "custom_test_rule",
      severity: "warning",
      description: "Custom test rule",
      detect: (stmt: ParsedStatement, _ctx: CheckContext) =>
        stmt.type === "alterTable" && stmt.action === "addColumn",
      message: () => "Custom rule triggered",
      suggestion: () => "Custom suggestion",
    };

    const results = await check({
      sql: 'ALTER TABLE "users" ADD COLUMN "age" integer;',
      config: { ...baseConfig, customRules: [customRule] },
      migrationPath: "migration.sql",
    });
    expect(results).toHaveLength(1);
    expect(results[0].rule.name).toBe("custom_test_rule");
  });

  it("should detect add_index without CONCURRENTLY", async () => {
    const results = await check({
      sql: 'CREATE INDEX "users_email_idx" ON "users"("email");',
      config: baseConfig,
      migrationPath: "migration.sql",
    });
    expect(results).toHaveLength(1);
    expect(results[0].rule.name).toBe("add_index");
  });

  it("should not flag CREATE INDEX CONCURRENTLY", async () => {
    const results = await check({
      sql: 'CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");',
      config: baseConfig,
      migrationPath: "migration.sql",
    });
    expect(results).toEqual([]);
  });
});
