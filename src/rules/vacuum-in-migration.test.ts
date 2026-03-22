import { describe, it, expect } from "vite-plus/test";
import { vacuumInMigrationRule } from "./vacuum-in-migration";
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

describe("vacuumInMigrationRule", () => {
  describe("detect", () => {
    it("should detect VACUUM ANALYZE statement", () => {
      const stmt: ParsedStatement = {
        type: "vacuum",
        raw: 'VACUUM ANALYZE "users";',
        line: 1,
        table: "users",
      };
      expect(vacuumInMigrationRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect plain VACUUM statement", () => {
      const stmt: ParsedStatement = {
        type: "vacuum",
        raw: 'VACUUM "users";',
        line: 1,
        table: "users",
      };
      expect(vacuumInMigrationRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect VACUUM without table", () => {
      const stmt: ParsedStatement = {
        type: "vacuum",
        raw: "VACUUM;",
        line: 1,
      };
      expect(vacuumInMigrationRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ALTER TABLE", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
        line: 1,
        table: "users",
        action: "addColumn",
      };
      expect(vacuumInMigrationRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect CREATE INDEX", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "idx" ON "users"("email");',
        line: 1,
      };
      expect(vacuumInMigrationRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should mention transaction restriction", () => {
      const stmt: ParsedStatement = {
        type: "vacuum",
        raw: 'VACUUM ANALYZE "users";',
        line: 1,
        table: "users",
      };
      expect(vacuumInMigrationRule.message(stmt)).toContain("transaction");
    });
  });

  describe("severity", () => {
    it("should be error", () => {
      expect(vacuumInMigrationRule.severity).toBe("error");
    });
  });
});
