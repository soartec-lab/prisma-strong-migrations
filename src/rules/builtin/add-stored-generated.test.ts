import { describe, it, expect } from "vite-plus/test";
import { addStoredGeneratedRule } from "./add-stored-generated";
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

describe("addStoredGeneratedRule", () => {
  describe("detect", () => {
    it("should detect ADD COLUMN with STORED generated", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "full_name" text GENERATED ALWAYS AS (first_name || \' \' || last_name) STORED;',
        line: 1,
        table: "users",
        column: "full_name",
        dataType: "text",
      };
      expect(addStoredGeneratedRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ADD COLUMN without STORED", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "full_name" text;',
        line: 1,
        table: "users",
        column: "full_name",
        dataType: "text",
      };
      expect(addStoredGeneratedRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect non-addColumn statement", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "dropColumn",
        raw: 'ALTER TABLE "users" DROP COLUMN "full_name";',
        line: 1,
        table: "users",
        column: "full_name",
      };
      expect(addStoredGeneratedRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
