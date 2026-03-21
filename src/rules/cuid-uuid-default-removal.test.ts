import { describe, it, expect } from "vite-plus/test";
import { cuidUuidDefaultRemovalRule } from "./cuid-uuid-default-removal";
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

describe("cuidUuidDefaultRemovalRule", () => {
  describe("detect", () => {
    it("should detect DROP DEFAULT on id column", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;',
        line: 1,
        table: "User",
        action: "dropColumnDefault",
        column: "id",
      };
      expect(cuidUuidDefaultRemovalRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect DROP DEFAULT on ID column (uppercase)", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "User" ALTER COLUMN "ID" DROP DEFAULT;',
        line: 1,
        table: "User",
        action: "dropColumnDefault",
        column: "ID",
      };
      expect(cuidUuidDefaultRemovalRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect DROP DEFAULT on non-id columns", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "User" ALTER COLUMN "name" DROP DEFAULT;',
        line: 1,
        table: "User",
        action: "dropColumnDefault",
        column: "name",
      };
      expect(cuidUuidDefaultRemovalRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect SET DEFAULT on id column", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();',
        line: 1,
        table: "User",
        action: "alterColumnSetDefault",
        column: "id",
      };
      expect(cuidUuidDefaultRemovalRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect unrelated statement types", () => {
      const stmt: ParsedStatement = {
        type: "dropTable",
        raw: 'DROP TABLE "User";',
        line: 1,
        table: "User",
      };
      expect(cuidUuidDefaultRemovalRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include the table name", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;',
        line: 1,
        table: "User",
        action: "dropColumnDefault",
        column: "id",
      };
      expect(cuidUuidDefaultRemovalRule.message(stmt)).toContain('"User"');
    });
  });

  describe("rule metadata", () => {
    it("should have error severity", () => {
      expect(cuidUuidDefaultRemovalRule.severity).toBe("error");
    });

    it("should have correct name", () => {
      expect(cuidUuidDefaultRemovalRule.name).toBe("cuidUuidDefaultRemoval");
    });
  });
});
