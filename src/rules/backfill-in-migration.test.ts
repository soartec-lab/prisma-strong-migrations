import { describe, it, expect } from "vite-plus/test";
import { backfillInMigrationRule } from "./backfill-in-migration";
import type { ParsedStatement } from "../parser/types";
import type { CheckContext } from "./types";

const baseConfig = {
  disabledRules: [],
  ignoreMigrations: [],
  customRulesDir: "",
  customRules: [],
  warningsAsErrors: false,
  ci: { failOnWarning: false, failOnError: true },
  migrationsDir: "",
};

const makeContext = (statements: ParsedStatement[]): CheckContext => ({
  statements,
  migrationPath: "test.sql",
  config: baseConfig,
});

const updateStmt: ParsedStatement = {
  type: "updateStatement",
  raw: 'UPDATE "users" SET "full_name" = first_name || \' \' || last_name;',
  line: 2,
  table: "users",
  hasWhere: false,
};

const alterTableStmt: ParsedStatement = {
  type: "alterTable",
  raw: 'ALTER TABLE "users" ADD COLUMN "full_name" text;',
  line: 1,
  table: "users",
  action: "addColumn",
};

describe("backfillInMigrationRule", () => {
  describe("detect", () => {
    it("should detect UPDATE when ALTER TABLE is in the same file", () => {
      const context = makeContext([alterTableStmt, updateStmt]);
      expect(backfillInMigrationRule.detect(updateStmt, context)).toBe(true);
    });

    it("should not detect UPDATE when no ALTER TABLE is in the file", () => {
      const context = makeContext([updateStmt]);
      expect(backfillInMigrationRule.detect(updateStmt, context)).toBe(false);
    });

    it("should not fire on alterTable statement", () => {
      const context = makeContext([alterTableStmt, updateStmt]);
      expect(backfillInMigrationRule.detect(alterTableStmt, context)).toBe(false);
    });

    it("should not fire on non-updateStatement types even with alterTable", () => {
      const deleteStmt: ParsedStatement = {
        type: "deleteStatement",
        raw: 'DELETE FROM "users";',
        line: 3,
        table: "users",
        hasWhere: false,
      };
      const context = makeContext([alterTableStmt, deleteStmt]);
      expect(backfillInMigrationRule.detect(deleteStmt, context)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include table name when present", () => {
      expect(backfillInMigrationRule.message(updateStmt)).toContain("users");
    });

    it("should handle missing table name", () => {
      const stmt: ParsedStatement = {
        type: "updateStatement",
        raw: "UPDATE SET col = 1;",
        line: 1,
        hasWhere: false,
      };
      expect(backfillInMigrationRule.message(stmt)).toContain("UPDATE");
    });
  });

  describe("severity", () => {
    it("should be error", () => {
      expect(backfillInMigrationRule.severity).toBe("error");
    });
  });
});
