import { describe, it, expect } from "vite-plus/test";
import { concurrentWithoutDisableTransactionRule } from "./concurrent-without-disable-transaction";
import type { ParsedStatement } from "../parser/types";
import type { CheckContext } from "./types";

const baseConfig = {
  disabledRules: [],
  ignoreMigrations: [],
  customRulesDir: "",
  customRules: [],
  warningsAsErrors: false,
  ci: { failOnWarning: false, failOnError: true },
  migrationsDir: "",
};

const makeContext = (statements: ParsedStatement[]): CheckContext => ({
  statements,
  migrationPath: "test.sql",
  config: baseConfig,
});

const concurrentCreateIndex: ParsedStatement = {
  type: "createIndex",
  raw: 'CREATE INDEX CONCURRENTLY "idx" ON "users"("email");',
  line: 1,
  concurrently: true,
  indexName: "idx",
  table: "users",
};

const concurrentDropIndex: ParsedStatement = {
  type: "dropIndex",
  raw: 'DROP INDEX CONCURRENTLY "idx";',
  line: 1,
  concurrently: true,
  indexName: "idx",
};

const disableTransactionStmt: ParsedStatement = {
  type: "disableTransaction",
  raw: "-- prisma-migrate-disable-next-transaction",
  line: 1,
};

describe("concurrentWithoutDisableTransactionRule", () => {
  describe("detect", () => {
    it("should detect CREATE INDEX CONCURRENTLY without disableTransaction", () => {
      const context = makeContext([concurrentCreateIndex]);
      expect(concurrentWithoutDisableTransactionRule.detect(concurrentCreateIndex, context)).toBe(
        true,
      );
    });

    it("should detect DROP INDEX CONCURRENTLY without disableTransaction", () => {
      const context = makeContext([concurrentDropIndex]);
      expect(concurrentWithoutDisableTransactionRule.detect(concurrentDropIndex, context)).toBe(
        true,
      );
    });

    it("should not detect CREATE INDEX CONCURRENTLY when disableTransaction is present", () => {
      const context = makeContext([disableTransactionStmt, concurrentCreateIndex]);
      expect(concurrentWithoutDisableTransactionRule.detect(concurrentCreateIndex, context)).toBe(
        false,
      );
    });

    it("should not detect DROP INDEX CONCURRENTLY when disableTransaction is present", () => {
      const context = makeContext([disableTransactionStmt, concurrentDropIndex]);
      expect(concurrentWithoutDisableTransactionRule.detect(concurrentDropIndex, context)).toBe(
        false,
      );
    });

    it("should not detect non-concurrent CREATE INDEX", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "idx" ON "users"("email");',
        line: 1,
        concurrently: false,
        indexName: "idx",
        table: "users",
      };
      const context = makeContext([stmt]);
      expect(concurrentWithoutDisableTransactionRule.detect(stmt, context)).toBe(false);
    });

    it("should not detect non-concurrent DROP INDEX", () => {
      const stmt: ParsedStatement = {
        type: "dropIndex",
        raw: 'DROP INDEX "idx";',
        line: 1,
        concurrently: false,
        indexName: "idx",
      };
      const context = makeContext([stmt]);
      expect(concurrentWithoutDisableTransactionRule.detect(stmt, context)).toBe(false);
    });
  });

  describe("message", () => {
    it("should mention CREATE for createIndex", () => {
      expect(concurrentWithoutDisableTransactionRule.message(concurrentCreateIndex)).toContain(
        "CREATE",
      );
    });

    it("should mention DROP for dropIndex", () => {
      expect(concurrentWithoutDisableTransactionRule.message(concurrentDropIndex)).toContain(
        "DROP",
      );
    });
  });

  describe("severity", () => {
    it("should be error", () => {
      expect(concurrentWithoutDisableTransactionRule.severity).toBe("error");
    });
  });
});
