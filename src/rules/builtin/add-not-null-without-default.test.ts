import { describe, it, expect } from "vite-plus/test";
import { addNotNullWithoutDefaultRule } from "./add-not-null-without-default";
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

describe("addNotNullWithoutDefaultRule", () => {
  describe("detect", () => {
    it("should detect ADD COLUMN NOT NULL without default", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "status" text NOT NULL;',
        line: 1,
        table: "users",
        action: "addColumn",
        column: "status",
        dataType: "text",
        notNull: true,
      };
      expect(addNotNullWithoutDefaultRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ADD COLUMN NOT NULL with default", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "status" text NOT NULL DEFAULT \'active\';',
        line: 1,
        table: "users",
        action: "addColumn",
        column: "status",
        dataType: "text",
        notNull: true,
        hasDefault: true,
      };
      expect(addNotNullWithoutDefaultRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect ADD COLUMN nullable (no NOT NULL)", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "bio" text;',
        line: 1,
        table: "users",
        action: "addColumn",
        column: "bio",
        dataType: "text",
      };
      expect(addNotNullWithoutDefaultRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect DROP COLUMN", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" DROP COLUMN "status";',
        line: 1,
        table: "users",
        action: "dropColumn",
        column: "status",
      };
      expect(addNotNullWithoutDefaultRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("severity", () => {
    it("should be a warning", () => {
      expect(addNotNullWithoutDefaultRule.severity).toBe("warning");
    });
  });

  describe("message", () => {
    it("should include column name in message", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "status" text NOT NULL;',
        line: 1,
        table: "users",
        action: "addColumn",
        column: "status",
        notNull: true,
      };
      expect(addNotNullWithoutDefaultRule.message(stmt)).toContain("status");
    });
  });
});
