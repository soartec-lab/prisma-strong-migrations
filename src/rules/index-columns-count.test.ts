import { describe, it, expect } from "vite-plus/test";
import { indexColumnsCountRule } from "./index-columns-count";
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

describe("indexColumnsCountRule", () => {
  describe("detect", () => {
    it("should detect index with 4 columns", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "idx_users_multi" ON "users"("a", "b", "c", "d");',
        line: 1,
        indexName: "idx_users_multi",
        columns: ["a", "b", "c", "d"],
        concurrently: false,
        unique: false,
      };
      expect(indexColumnsCountRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect index with 5 columns", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "idx_users_multi" ON "users"("a", "b", "c", "d", "e");',
        line: 1,
        indexName: "idx_users_multi",
        columns: ["a", "b", "c", "d", "e"],
        concurrently: false,
        unique: false,
      };
      expect(indexColumnsCountRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect index with 3 columns", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "idx_users_multi" ON "users"("a", "b", "c");',
        line: 1,
        indexName: "idx_users_multi",
        columns: ["a", "b", "c"],
        concurrently: false,
        unique: false,
      };
      expect(indexColumnsCountRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect unique index with 4 columns", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE UNIQUE INDEX "idx_users_unique" ON "users"("a", "b", "c", "d");',
        line: 1,
        indexName: "idx_users_unique",
        columns: ["a", "b", "c", "d"],
        concurrently: false,
        unique: true,
      };
      expect(indexColumnsCountRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect non-createIndex statement", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "dropColumn",
        raw: 'ALTER TABLE "users" DROP COLUMN "name";',
        line: 1,
        table: "users",
        column: "name",
      };
      expect(indexColumnsCountRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  it("should have warning severity", () => {
    expect(indexColumnsCountRule.severity).toBe("warning");
  });
});
