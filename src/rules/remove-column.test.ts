import { describe, it, expect } from "vite-plus/test";
import { removeColumnRule } from "./remove-column";
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

describe("removeColumnRule", () => {
  describe("detect", () => {
    it("should detect DROP COLUMN", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "dropColumn",
        raw: 'ALTER TABLE "users" DROP COLUMN "name";',
        line: 1,
        table: "users",
        column: "name",
      };
      expect(removeColumnRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ADD COLUMN", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
        line: 1,
        table: "users",
        column: "name",
      };
      expect(removeColumnRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect non-alterTable statement", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "idx" ON "users"("email");',
        line: 1,
      };
      expect(removeColumnRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
