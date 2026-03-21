import { describe, it, expect } from "vite-plus/test";
import { mixedStatementsWithDisabledTransactionRule } from "./mixed-statements-with-disabled-transaction";
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

const disableTransactionStmt: ParsedStatement = {
  type: "disableTransaction",
  raw: "-- prisma-migrate-disable-next-transaction",
  line: 1,
};

const createIndexStmt: ParsedStatement = {
  type: "createIndex",
  raw: 'CREATE INDEX CONCURRENTLY "idx" ON "users"("email");',
  line: 2,
  concurrently: true,
  indexName: "idx",
  table: "users",
};

const alterTableStmt: ParsedStatement = {
  type: "alterTable",
  raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
  line: 3,
  table: "users",
  action: "addColumn",
};

describe("mixedStatementsWithDisabledTransactionRule", () => {
  describe("detect", () => {
    it("should detect disableTransaction when there are multiple SQL statements", () => {
      const context = makeContext([disableTransactionStmt, createIndexStmt, alterTableStmt]);
      expect(
        mixedStatementsWithDisabledTransactionRule.detect(disableTransactionStmt, context),
      ).toBe(true);
    });

    it("should not detect disableTransaction when there is only one SQL statement", () => {
      const context = makeContext([disableTransactionStmt, createIndexStmt]);
      expect(
        mixedStatementsWithDisabledTransactionRule.detect(disableTransactionStmt, context),
      ).toBe(false);
    });

    it("should not detect disableTransaction when there are no SQL statements", () => {
      const context = makeContext([disableTransactionStmt]);
      expect(
        mixedStatementsWithDisabledTransactionRule.detect(disableTransactionStmt, context),
      ).toBe(false);
    });

    it("should not fire on non-disableTransaction statements", () => {
      const context = makeContext([disableTransactionStmt, createIndexStmt, alterTableStmt]);
      expect(mixedStatementsWithDisabledTransactionRule.detect(createIndexStmt, context)).toBe(
        false,
      );
      expect(mixedStatementsWithDisabledTransactionRule.detect(alterTableStmt, context)).toBe(
        false,
      );
    });
  });

  describe("message", () => {
    it("should mention multiple statements and disabled transaction", () => {
      const msg = mixedStatementsWithDisabledTransactionRule.message(disableTransactionStmt);
      expect(msg).toContain("Multiple statements");
      expect(msg).toContain("disabled transaction");
    });
  });

  describe("severity", () => {
    it("should be error", () => {
      expect(mixedStatementsWithDisabledTransactionRule.severity).toBe("error");
    });
  });
});
