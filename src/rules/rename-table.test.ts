import { describe, it, expect } from "vite-plus/test";
import { renameTableRule } from "./rename-table";
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

describe("renameTableRule", () => {
  describe("detect", () => {
    it("should detect RENAME TO", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "renameTable",
        raw: 'ALTER TABLE "users" RENAME TO "accounts";',
        line: 1,
        table: "users",
      };
      expect(renameTableRule.detect(stmt, mockContext)).toBe(true);
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
      expect(renameTableRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect non-alterTable statement", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "idx" ON "users"("email");',
        line: 1,
      };
      expect(renameTableRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
