import { describe, it, expect } from "vite-plus/test";
import { clusterTableRule } from "./cluster-table";
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

describe("clusterTableRule", () => {
  describe("detect", () => {
    it("should detect CLUSTER ... USING statement", () => {
      const stmt: ParsedStatement = {
        type: "clusterTable",
        raw: 'CLUSTER "users" USING "users_pkey";',
        line: 1,
        table: "users",
      };
      expect(clusterTableRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect CLUSTER without USING clause", () => {
      const stmt: ParsedStatement = {
        type: "clusterTable",
        raw: 'CLUSTER "users";',
        line: 1,
        table: "users",
      };
      expect(clusterTableRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ALTER TABLE", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
        line: 1,
        table: "users",
        action: "addColumn",
      };
      expect(clusterTableRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect CREATE INDEX", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "idx" ON "users"("email");',
        line: 1,
      };
      expect(clusterTableRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include table name in message", () => {
      const stmt: ParsedStatement = {
        type: "clusterTable",
        raw: 'CLUSTER "users" USING "users_pkey";',
        line: 1,
        table: "users",
      };
      expect(clusterTableRule.message(stmt)).toContain("users");
    });
  });

  describe("severity", () => {
    it("should be error", () => {
      expect(clusterTableRule.severity).toBe("error");
    });
  });
});
