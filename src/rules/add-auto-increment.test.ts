import { describe, it, expect } from "vite-plus/test";
import { addAutoIncrementRule } from "./add-auto-increment";
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

describe("addAutoIncrementRule", () => {
  describe("detect", () => {
    it("should detect ADD COLUMN with serial type", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "legacy_id" serial;',
        line: 1,
        table: "users",
        column: "legacy_id",
        dataType: "serial",
      };
      expect(addAutoIncrementRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect ADD COLUMN with bigserial type", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "legacy_id" bigserial;',
        line: 1,
        table: "users",
        column: "legacy_id",
        dataType: "bigserial",
      };
      expect(addAutoIncrementRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect ADD COLUMN with smallserial type", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "legacy_id" smallserial;',
        line: 1,
        table: "users",
        column: "legacy_id",
        dataType: "smallserial",
      };
      expect(addAutoIncrementRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ADD COLUMN with integer type", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "count" integer;',
        line: 1,
        table: "users",
        column: "count",
        dataType: "integer",
      };
      expect(addAutoIncrementRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
