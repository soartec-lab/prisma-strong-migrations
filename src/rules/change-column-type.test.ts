import { describe, it, expect } from "vite-plus/test";
import { changeColumnTypeRule } from "./change-column-type";
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

describe("changeColumnTypeRule", () => {
  describe("detect", () => {
    it("should detect ALTER COLUMN TYPE", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "alterColumnType",
        raw: 'ALTER TABLE "users" ALTER COLUMN "age" TYPE bigint;',
        line: 1,
        table: "users",
        column: "age",
        dataType: "bigint",
      };
      expect(changeColumnTypeRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ADD COLUMN", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "age" bigint;',
        line: 1,
        table: "users",
        column: "age",
      };
      expect(changeColumnTypeRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect non-alterTable statement", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "idx" ON "users"("email");',
        line: 1,
      };
      expect(changeColumnTypeRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
