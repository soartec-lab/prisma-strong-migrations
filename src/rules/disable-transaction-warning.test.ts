import { describe, it, expect } from "vite-plus/test";
import { disableTransactionWarningRule } from "./disable-transaction-warning";
import type { ParsedStatement } from "../parser/types";
import type { CheckContext } from "./types";

const mockContext: CheckContext = {
  statements: [],
  migrationPath: "test.sql",
  config: {
    disabledRules: [],
    ignoreMigrations: [],
    customRulesDir: "",
    customRules: [],
    warningsAsErrors: false,
    failOnWarning: false,
    failOnError: true,
    migrationsDir: "",
  },
};

describe("disableTransactionWarningRule", () => {
  describe("detect", () => {
    it("should detect disableTransaction statement", () => {
      const stmt: ParsedStatement = {
        type: "disableTransaction",
        raw: "-- prisma-migrate-disable-next-transaction",
        line: 1,
      };
      expect(disableTransactionWarningRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect createIndex statement", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");',
        line: 2,
        concurrently: true,
      };
      expect(disableTransactionWarningRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect alterTable statement", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
        line: 2,
        action: "addColumn",
      };
      expect(disableTransactionWarningRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("severity", () => {
    it("should be a warning", () => {
      expect(disableTransactionWarningRule.severity).toBe("warning");
    });
  });
});
