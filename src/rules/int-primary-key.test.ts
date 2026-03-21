import { describe, it, expect } from "vite-plus/test";
import { intPrimaryKeyRule } from "./int-primary-key";
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

describe("intPrimaryKeyRule", () => {
  describe("detect", () => {
    it("should detect CREATE TABLE with SERIAL id column", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "User" ("id" SERIAL NOT NULL, "name" TEXT NOT NULL);',
        line: 1,
        table: "User",
        hasSerialId: true,
      };
      expect(intPrimaryKeyRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect CREATE TABLE with BIGSERIAL id column", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "User" ("id" BIGSERIAL NOT NULL, "name" TEXT NOT NULL);',
        line: 1,
        table: "User",
        hasSerialId: false,
      };
      expect(intPrimaryKeyRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect CREATE TABLE without serial id", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "User" ("id" TEXT NOT NULL);',
        line: 1,
        table: "User",
        hasSerialId: false,
      };
      expect(intPrimaryKeyRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect ALTER TABLE statements", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "User" ADD COLUMN "email" TEXT;',
        line: 1,
        table: "User",
        action: "addColumn",
      };
      expect(intPrimaryKeyRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include the table name", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "User" ("id" SERIAL NOT NULL);',
        line: 1,
        table: "User",
        hasSerialId: true,
      };
      expect(intPrimaryKeyRule.message(stmt)).toContain('"User"');
    });

    it("should mention SERIAL and 2.1 billion", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "User" ("id" SERIAL NOT NULL);',
        line: 1,
        table: "User",
        hasSerialId: true,
      };
      expect(intPrimaryKeyRule.message(stmt)).toContain("SERIAL");
      expect(intPrimaryKeyRule.message(stmt)).toContain("2.1 billion");
    });
  });

  describe("rule metadata", () => {
    it("should have error severity", () => {
      expect(intPrimaryKeyRule.severity).toBe("error");
    });

    it("should have correct name", () => {
      expect(intPrimaryKeyRule.name).toBe("intPrimaryKey");
    });
  });
});
