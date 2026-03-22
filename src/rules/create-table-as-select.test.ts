import { describe, it, expect } from "vite-plus/test";
import { createTableAsSelectRule } from "./create-table-as-select";
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

describe("createTableAsSelectRule", () => {
  describe("detect", () => {
    it("should detect CREATE TABLE AS SELECT", () => {
      const stmt: ParsedStatement = {
        type: "createTableAsSelect",
        raw: 'CREATE TABLE "users_backup" AS SELECT * FROM "users";',
        line: 1,
        table: "users_backup",
      };
      expect(createTableAsSelectRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect regular CREATE TABLE", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "users" (id serial PRIMARY KEY);',
        line: 1,
        table: "users",
      };
      expect(createTableAsSelectRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect ALTER TABLE", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
        line: 1,
        table: "users",
        action: "addColumn",
      };
      expect(createTableAsSelectRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include table name in message", () => {
      const stmt: ParsedStatement = {
        type: "createTableAsSelect",
        raw: 'CREATE TABLE "users_backup" AS SELECT * FROM "users";',
        line: 1,
        table: "users_backup",
      };
      expect(createTableAsSelectRule.message(stmt)).toContain("users_backup");
    });
  });

  describe("severity", () => {
    it("should be warning", () => {
      expect(createTableAsSelectRule.severity).toBe("warning");
    });
  });
});
