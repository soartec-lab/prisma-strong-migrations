import { describe, it, expect } from "vite-plus/test";
import { addJsonColumnRule } from "./add-json-column";
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

describe("addJsonColumnRule", () => {
  describe("detect", () => {
    it("should detect ADD COLUMN with json type", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "metadata" json;',
        line: 1,
        table: "users",
        column: "metadata",
        dataType: "json",
      };
      expect(addJsonColumnRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ADD COLUMN with jsonb type", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "metadata" jsonb;',
        line: 1,
        table: "users",
        column: "metadata",
        dataType: "jsonb",
      };
      expect(addJsonColumnRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect ADD COLUMN with text type", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
        line: 1,
        table: "users",
        column: "name",
        dataType: "text",
      };
      expect(addJsonColumnRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
