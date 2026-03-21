import { describe, it, expect } from "vite-plus/test";
import { deleteWithoutWhereRule } from "./delete-without-where";
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

describe("deleteWithoutWhereRule", () => {
  describe("detect", () => {
    it("should detect DELETE FROM without WHERE clause", () => {
      const stmt: ParsedStatement = {
        type: "deleteStatement",
        raw: 'DELETE FROM "users";',
        line: 1,
        table: "users",
        hasWhere: false,
      };
      expect(deleteWithoutWhereRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect DELETE FROM with WHERE clause", () => {
      const stmt: ParsedStatement = {
        type: "deleteStatement",
        raw: 'DELETE FROM "users" WHERE id = 1;',
        line: 1,
        table: "users",
        hasWhere: true,
      };
      expect(deleteWithoutWhereRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect non-deleteStatement types", () => {
      const stmt: ParsedStatement = {
        type: "truncateTable",
        raw: 'TRUNCATE TABLE "users";',
        line: 1,
        table: "users",
      };
      expect(deleteWithoutWhereRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include table name when present", () => {
      const stmt: ParsedStatement = {
        type: "deleteStatement",
        raw: 'DELETE FROM "users";',
        line: 1,
        table: "users",
        hasWhere: false,
      };
      expect(deleteWithoutWhereRule.message(stmt)).toContain("users");
    });

    it("should handle missing table name", () => {
      const stmt: ParsedStatement = {
        type: "deleteStatement",
        raw: "DELETE FROM;",
        line: 1,
        hasWhere: false,
      };
      expect(deleteWithoutWhereRule.message(stmt)).toContain("DELETE FROM");
    });
  });

  describe("severity", () => {
    it("should be warning", () => {
      expect(deleteWithoutWhereRule.severity).toBe("warning");
    });
  });
});
