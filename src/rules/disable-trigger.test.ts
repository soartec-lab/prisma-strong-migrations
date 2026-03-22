import { describe, it, expect } from "vite-plus/test";
import { disableTriggerRule } from "./disable-trigger";
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

describe("disableTriggerRule", () => {
  describe("detect", () => {
    it("should detect DISABLE TRIGGER ALL", () => {
      const stmt: ParsedStatement = {
        type: "disableTrigger",
        raw: 'ALTER TABLE "users" DISABLE TRIGGER ALL;',
        line: 1,
        table: "users",
      };
      expect(disableTriggerRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect DISABLE TRIGGER with specific trigger name", () => {
      const stmt: ParsedStatement = {
        type: "disableTrigger",
        raw: 'ALTER TABLE "users" DISABLE TRIGGER "audit_trigger";',
        line: 1,
        table: "users",
      };
      expect(disableTriggerRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect regular ALTER TABLE", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
        line: 1,
        table: "users",
        action: "addColumn",
      };
      expect(disableTriggerRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect ENABLE TRIGGER", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ENABLE TRIGGER ALL;',
        line: 1,
        table: "users",
      };
      expect(disableTriggerRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include table name in message", () => {
      const stmt: ParsedStatement = {
        type: "disableTrigger",
        raw: 'ALTER TABLE "users" DISABLE TRIGGER ALL;',
        line: 1,
        table: "users",
      };
      expect(disableTriggerRule.message(stmt)).toContain("users");
    });
  });

  describe("severity", () => {
    it("should be error", () => {
      expect(disableTriggerRule.severity).toBe("error");
    });
  });
});
