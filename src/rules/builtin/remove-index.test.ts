import { describe, it, expect } from "vite-plus/test";
import { removeIndexRule } from "./remove-index";
import type { ParsedStatement } from "../../parser/types";
import type { CheckContext } from "../types";

const mockContext: CheckContext = {
  statements: [],
  migrationPath: "test.sql",
  config: {
    disabledRules: [],
    ignoreMigrations: [],
    customRulesDir: "",
    customRules: [],
    warningsAsErrors: false,
    ci: { failOnWarning: false, failOnError: true },
    migrationsDir: "",
  },
};

describe("removeIndexRule", () => {
  describe("detect", () => {
    it("should detect DROP INDEX without CONCURRENTLY", () => {
      const stmt: ParsedStatement = {
        type: "dropIndex",
        raw: 'DROP INDEX "users_email_idx";',
        line: 1,
        indexName: "users_email_idx",
        concurrently: false,
      };
      expect(removeIndexRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect DROP INDEX CONCURRENTLY", () => {
      const stmt: ParsedStatement = {
        type: "dropIndex",
        raw: 'DROP INDEX CONCURRENTLY "users_email_idx";',
        line: 1,
        indexName: "users_email_idx",
        concurrently: true,
      };
      expect(removeIndexRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect CREATE INDEX", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "users_email_idx" ON "users"("email");',
        line: 1,
        indexName: "users_email_idx",
        concurrently: false,
      };
      expect(removeIndexRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
