import { describe, it, expect } from "vite-plus/test";
import { setNotNullRule } from "./set-not-null";
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

describe("setNotNullRule", () => {
  describe("detect", () => {
    it("should detect SET NOT NULL", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "alterColumnSetNotNull",
        raw: 'ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;',
        line: 1,
        table: "users",
        column: "email",
      };
      expect(setNotNullRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ADD COLUMN", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "email" text NOT NULL;',
        line: 1,
        table: "users",
        column: "email",
      };
      expect(setNotNullRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect non-alterTable statement", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "idx" ON "users"("email");',
        line: 1,
      };
      expect(setNotNullRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
