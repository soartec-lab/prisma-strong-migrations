import { describe, it, expect } from "vite-plus/test";
import { truncateTableRule } from "./truncate-table";
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

describe("truncateTableRule", () => {
  describe("detect", () => {
    it("should detect TRUNCATE TABLE statement", () => {
      const stmt: ParsedStatement = {
        type: "truncateTable",
        raw: 'TRUNCATE TABLE "users";',
        line: 1,
        table: "users",
      };
      expect(truncateTableRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect TRUNCATE without TABLE keyword", () => {
      const stmt: ParsedStatement = {
        type: "truncateTable",
        raw: 'TRUNCATE "users";',
        line: 1,
        table: "users",
      };
      expect(truncateTableRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect DROP TABLE", () => {
      const stmt: ParsedStatement = {
        type: "dropTable",
        raw: 'DROP TABLE "users";',
        line: 1,
        table: "users",
      };
      expect(truncateTableRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect ALTER TABLE", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
        line: 1,
        table: "users",
        action: "addColumn",
      };
      expect(truncateTableRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include table name in message", () => {
      const stmt: ParsedStatement = {
        type: "truncateTable",
        raw: 'TRUNCATE TABLE "users";',
        line: 1,
        table: "users",
      };
      expect(truncateTableRule.message(stmt)).toContain("users");
    });

    it("should handle missing table name", () => {
      const stmt: ParsedStatement = {
        type: "truncateTable",
        raw: "TRUNCATE;",
        line: 1,
      };
      expect(truncateTableRule.message(stmt)).toContain("TRUNCATE");
    });
  });

  describe("severity", () => {
    it("should be error", () => {
      expect(truncateTableRule.severity).toBe("error");
    });
  });
});
