import { describe, it, expect } from "vite-plus/test";
import { dropTableRule } from "./drop-table";
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

describe("dropTableRule", () => {
  describe("detect", () => {
    it("should detect DROP TABLE statement", () => {
      const stmt: ParsedStatement = {
        type: "dropTable",
        raw: 'DROP TABLE "users";',
        line: 1,
        table: "users",
      };
      expect(dropTableRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect CREATE TABLE statement", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "users" (id serial PRIMARY KEY);',
        line: 1,
        table: "users",
      };
      expect(dropTableRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect ALTER TABLE statement", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
        line: 1,
        table: "users",
        action: "addColumn",
        column: "name",
      };
      expect(dropTableRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include table name in message", () => {
      const stmt: ParsedStatement = {
        type: "dropTable",
        raw: 'DROP TABLE "users";',
        line: 1,
        table: "users",
      };
      expect(dropTableRule.message(stmt)).toContain("users");
    });
  });
});
