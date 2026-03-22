import { describe, it, expect } from "vite-plus/test";
import { prismaManagedColumnChangeRule } from "./prisma-managed-column-change";
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

describe("prismaManagedColumnChangeRule", () => {
  describe("detect", () => {
    it("should detect SET DEFAULT on updatedAt column", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT NOW();',
        line: 1,
        table: "User",
        action: "alterColumnSetDefault",
        column: "updatedAt",
      };
      expect(prismaManagedColumnChangeRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect SET DEFAULT on updated_at column (snake_case)", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT NOW();',
        line: 1,
        table: "users",
        action: "alterColumnSetDefault",
        column: "updated_at",
      };
      expect(prismaManagedColumnChangeRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect CREATE TRIGGER referencing updatedAt", () => {
      const stmt: ParsedStatement = {
        type: "createTrigger",
        raw: 'CREATE TRIGGER set_updatedAt BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();',
        line: 1,
        table: "User",
      };
      expect(prismaManagedColumnChangeRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect CREATE TRIGGER referencing updated_at", () => {
      const stmt: ParsedStatement = {
        type: "createTrigger",
        raw: 'CREATE TRIGGER set_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();',
        line: 1,
        table: "users",
      };
      expect(prismaManagedColumnChangeRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect SET DEFAULT on non-managed columns", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "User" ALTER COLUMN "name" SET DEFAULT \'unknown\';',
        line: 1,
        table: "User",
        action: "alterColumnSetDefault",
        column: "name",
      };
      expect(prismaManagedColumnChangeRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect CREATE TRIGGER unrelated to managed columns", () => {
      const stmt: ParsedStatement = {
        type: "createTrigger",
        raw: 'CREATE TRIGGER audit_log BEFORE INSERT ON "User" FOR EACH ROW EXECUTE FUNCTION log_insert();',
        line: 1,
        table: "User",
      };
      expect(prismaManagedColumnChangeRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect unrelated statement types", () => {
      const stmt: ParsedStatement = {
        type: "dropTable",
        raw: 'DROP TABLE "User";',
        line: 1,
        table: "User",
      };
      expect(prismaManagedColumnChangeRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should mention the column for SET DEFAULT case", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT NOW();',
        line: 1,
        table: "User",
        action: "alterColumnSetDefault",
        column: "updatedAt",
      };
      expect(prismaManagedColumnChangeRule.message(stmt)).toContain('"updatedAt"');
    });

    it("should mention CREATE TRIGGER for trigger case", () => {
      const stmt: ParsedStatement = {
        type: "createTrigger",
        raw: 'CREATE TRIGGER set_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();',
        line: 1,
        table: "User",
      };
      expect(prismaManagedColumnChangeRule.message(stmt)).toContain("CREATE TRIGGER");
    });
  });

  describe("rule metadata", () => {
    it("should have error severity", () => {
      expect(prismaManagedColumnChangeRule.severity).toBe("error");
    });

    it("should have correct name", () => {
      expect(prismaManagedColumnChangeRule.name).toBe("prismaManagedColumnChange");
    });
  });
});
