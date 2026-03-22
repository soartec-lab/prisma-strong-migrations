import { describe, it, expect } from "vite-plus/test";
import { addIndexRule } from "./add-index";
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

describe("addIndexRule", () => {
  describe("detect", () => {
    it("should detect CREATE INDEX without CONCURRENTLY", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "users_email_idx" ON "users"("email");',
        line: 1,
        indexName: "users_email_idx",
        concurrently: false,
      };
      expect(addIndexRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect CREATE INDEX CONCURRENTLY", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");',
        line: 1,
        indexName: "users_email_idx",
        concurrently: true,
      };
      expect(addIndexRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect DROP INDEX", () => {
      const stmt: ParsedStatement = {
        type: "dropIndex",
        raw: 'DROP INDEX "users_email_idx";',
        line: 1,
        indexName: "users_email_idx",
        concurrently: false,
      };
      expect(addIndexRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
