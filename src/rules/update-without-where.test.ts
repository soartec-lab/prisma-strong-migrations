import { describe, it, expect } from "vite-plus/test";
import { updateWithoutWhereRule } from "./update-without-where";
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
    ci: { failOnWarning: false, failOnError: true },
    migrationsDir: "",
  },
};

describe("updateWithoutWhereRule", () => {
  describe("detect", () => {
    it("should detect UPDATE without WHERE clause", () => {
      const stmt: ParsedStatement = {
        type: "updateStatement",
        raw: 'UPDATE "users" SET "name" = \'foo\';',
        line: 1,
        table: "users",
        hasWhere: false,
      };
      expect(updateWithoutWhereRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect UPDATE with WHERE clause", () => {
      const stmt: ParsedStatement = {
        type: "updateStatement",
        raw: 'UPDATE "users" SET "name" = \'foo\' WHERE id = 1;',
        line: 1,
        table: "users",
        hasWhere: true,
      };
      expect(updateWithoutWhereRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect non-updateStatement types", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
        line: 1,
        table: "users",
        action: "addColumn",
      };
      expect(updateWithoutWhereRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include table name when present", () => {
      const stmt: ParsedStatement = {
        type: "updateStatement",
        raw: 'UPDATE "users" SET "name" = \'foo\';',
        line: 1,
        table: "users",
        hasWhere: false,
      };
      expect(updateWithoutWhereRule.message(stmt)).toContain("users");
    });

    it("should handle missing table name", () => {
      const stmt: ParsedStatement = {
        type: "updateStatement",
        raw: "UPDATE SET col = 1;",
        line: 1,
        hasWhere: false,
      };
      expect(updateWithoutWhereRule.message(stmt)).toContain("UPDATE");
    });
  });

  describe("severity", () => {
    it("should be warning", () => {
      expect(updateWithoutWhereRule.severity).toBe("warning");
    });
  });
});
