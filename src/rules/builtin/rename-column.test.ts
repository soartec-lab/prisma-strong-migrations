import { describe, it, expect } from "vite-plus/test";
import { renameColumnRule } from "./rename-column";
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

describe("renameColumnRule", () => {
  describe("detect", () => {
    it("should detect RENAME COLUMN", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "renameColumn",
        raw: 'ALTER TABLE "users" RENAME COLUMN "name" TO "full_name";',
        line: 1,
        table: "users",
        column: "name",
      };
      expect(renameColumnRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect DROP COLUMN", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "dropColumn",
        raw: 'ALTER TABLE "users" DROP COLUMN "name";',
        line: 1,
        table: "users",
        column: "name",
      };
      expect(renameColumnRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect non-alterTable statement", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "idx" ON "users"("email");',
        line: 1,
      };
      expect(renameColumnRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
