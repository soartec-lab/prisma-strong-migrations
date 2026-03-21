import { describe, it, expect } from "vite-plus/test";
import { applyFixes } from "./fixer";
import type { CheckResult } from "./rules/types";
import { addIndexRule } from "./rules/add-index";
import { removeIndexRule } from "./rules/remove-index";
import { addForeignKeyRule } from "./rules/add-foreign-key";
import { addCheckConstraintRule } from "./rules/add-check-constraint";
import { setNotNullRule } from "./rules/set-not-null";
import { addUniqueConstraintRule } from "./rules/add-unique-constraint";
import { removeColumnRule } from "./rules/remove-column";
import { parseSql } from "./parser/sql-parser";

function makeResult(
  rule: Parameters<typeof applyFixes>[1][number]["rule"],
  sql: string,
): CheckResult {
  const statements = parseSql(sql);
  const statement = statements[0];
  return {
    rule,
    statement,
    message: rule.message(statement),
    suggestion: rule.suggestion(statement),
  };
}

describe("applyFixes", () => {
  describe("addIndex", () => {
    it("inserts CONCURRENTLY and adds disable-transaction header", () => {
      const sql = `CREATE INDEX "idx_email" ON "User"("email");`;
      const result = makeResult(addIndexRule, sql);
      const { sql: fixed, appliedCount } = applyFixes(sql, [result]);

      expect(appliedCount).toBe(1);
      expect(fixed).toContain("CREATE INDEX CONCURRENTLY");
      expect(fixed).toContain("-- prisma-migrate-disable-next-transaction");
    });

    it("preserves UNIQUE in CREATE UNIQUE INDEX", () => {
      const sql = `CREATE UNIQUE INDEX "idx_email" ON "User"("email");`;
      const result = makeResult(addIndexRule, sql);
      const { sql: fixed } = applyFixes(sql, [result]);

      expect(fixed).toContain("CREATE UNIQUE INDEX CONCURRENTLY");
    });
  });

  describe("removeIndex", () => {
    it("inserts CONCURRENTLY and adds disable-transaction header", () => {
      const sql = `DROP INDEX "idx_email";`;
      const result = makeResult(removeIndexRule, sql);
      const { sql: fixed, appliedCount } = applyFixes(sql, [result]);

      expect(appliedCount).toBe(1);
      expect(fixed).toContain("DROP INDEX CONCURRENTLY");
      expect(fixed).toContain("-- prisma-migrate-disable-next-transaction");
    });
  });

  describe("addForeignKey", () => {
    it("appends NOT VALID and adds VALIDATE CONSTRAINT", () => {
      const sql = `ALTER TABLE "Post" ADD CONSTRAINT "fk_post_user" FOREIGN KEY ("userId") REFERENCES "User"("id");`;
      const result = makeResult(addForeignKeyRule, sql);
      const { sql: fixed, appliedCount } = applyFixes(sql, [result]);

      expect(appliedCount).toBe(1);
      expect(fixed).toContain("NOT VALID");
      expect(fixed).toContain(`VALIDATE CONSTRAINT "fk_post_user"`);
    });
  });

  describe("addCheckConstraint", () => {
    it("appends NOT VALID and adds VALIDATE CONSTRAINT", () => {
      const sql = `ALTER TABLE "User" ADD CONSTRAINT "chk_age" CHECK ("age" >= 0);`;
      const result = makeResult(addCheckConstraintRule, sql);
      const { sql: fixed, appliedCount } = applyFixes(sql, [result]);

      expect(appliedCount).toBe(1);
      expect(fixed).toContain("NOT VALID");
      expect(fixed).toContain(`VALIDATE CONSTRAINT "chk_age"`);
    });
  });

  describe("setNotNull", () => {
    it("expands to 4-statement safe pattern", () => {
      const sql = `ALTER TABLE "Post" ALTER COLUMN "content" SET NOT NULL;`;
      const result = makeResult(setNotNullRule, sql);
      const { sql: fixed, appliedCount } = applyFixes(sql, [result]);

      expect(appliedCount).toBe(1);
      expect(fixed).toContain("ADD CONSTRAINT");
      expect(fixed).toContain("NOT VALID");
      expect(fixed).toContain("VALIDATE CONSTRAINT");
      expect(fixed).toContain("SET NOT NULL");
      expect(fixed).toContain("DROP CONSTRAINT");
      // Constraint name follows table_column_not_null convention
      expect(fixed).toContain('"Post_content_not_null"');
    });
  });

  describe("addUniqueConstraint", () => {
    it("converts to CONCURRENTLY index + USING INDEX", () => {
      const sql = `ALTER TABLE "User" ADD CONSTRAINT "uq_email" UNIQUE ("email");`;
      const result = makeResult(addUniqueConstraintRule, sql);
      const { sql: fixed, appliedCount } = applyFixes(sql, [result]);

      expect(appliedCount).toBe(1);
      expect(fixed).toContain("CREATE UNIQUE INDEX CONCURRENTLY");
      expect(fixed).toContain('"uq_email_idx"');
      expect(fixed).toContain("UNIQUE USING INDEX");
      expect(fixed).toContain("-- prisma-migrate-disable-next-transaction");
    });
  });

  describe("no-fix rules", () => {
    it("adds skipped result for rules without fix method", () => {
      const sql = `ALTER TABLE "User" DROP COLUMN "name";`;
      const stmt = parseSql(sql)[0];
      const result: CheckResult = {
        rule: removeColumnRule,
        statement: stmt,
        message: removeColumnRule.message(stmt),
        suggestion: removeColumnRule.suggestion(stmt),
      };

      const { appliedCount, skippedResults } = applyFixes(sql, [result]);

      expect(appliedCount).toBe(0);
      expect(skippedResults).toHaveLength(1);
    });
  });

  describe("disable-transaction header deduplication", () => {
    it("adds header only once when multiple rules require it", () => {
      const sql = [`CREATE INDEX "idx_a" ON "T"("a");`, `CREATE INDEX "idx_b" ON "T"("b");`].join(
        "\n",
      );

      const stmts = parseSql(sql);
      const results: CheckResult[] = stmts.map((stmt) => ({
        rule: addIndexRule,
        statement: stmt,
        message: addIndexRule.message(stmt),
        suggestion: addIndexRule.suggestion(stmt),
      }));

      const { sql: fixed } = applyFixes(sql, results);
      const headerCount = (fixed.match(/-- prisma-migrate-disable-next-transaction/g) ?? []).length;
      expect(headerCount).toBe(1);
    });
  });
});
