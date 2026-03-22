import { describe, it, expect } from "vite-plus/test";
import { addUniqueConstraintRule } from "./add-unique-constraint";
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

describe("addUniqueConstraintRule", () => {
  describe("detect", () => {
    it("should detect ADD UNIQUE constraint", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addConstraint",
        constraintType: "unique",
        raw: 'ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");',
        line: 1,
        table: "users",
        constraintName: "users_email_unique",
      };
      expect(addUniqueConstraintRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ADD CHECK constraint", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addConstraint",
        constraintType: "check",
        raw: 'ALTER TABLE "users" ADD CONSTRAINT "users_age_check" CHECK (age > 0);',
        line: 1,
        table: "users",
        constraintName: "users_age_check",
      };
      expect(addUniqueConstraintRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect non-alterTable statement", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE UNIQUE INDEX "users_email_idx" ON "users"("email");',
        line: 1,
        unique: true,
      };
      expect(addUniqueConstraintRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
