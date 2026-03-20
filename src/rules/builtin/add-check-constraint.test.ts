import { describe, it, expect } from "vite-plus/test";
import { addCheckConstraintRule } from "./add-check-constraint";
import type { ParsedStatement } from "../../parser/types";
import type { CheckContext } from "../types";

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

describe("addCheckConstraintRule", () => {
  describe("detect", () => {
    it("should detect ADD CHECK constraint without NOT VALID", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addConstraint",
        constraintType: "check",
        raw: 'ALTER TABLE "users" ADD CONSTRAINT "users_age_check" CHECK (age > 0);',
        line: 1,
        table: "users",
        constraintName: "users_age_check",
      };
      expect(addCheckConstraintRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ADD CHECK constraint with NOT VALID", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addConstraint",
        constraintType: "check",
        notValid: true,
        raw: 'ALTER TABLE "users" ADD CONSTRAINT "users_age_check" CHECK (age > 0) NOT VALID;',
        line: 1,
        table: "users",
        constraintName: "users_age_check",
      };
      expect(addCheckConstraintRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect ADD FOREIGN KEY constraint", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addConstraint",
        constraintType: "foreignKey",
        raw: 'ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");',
        line: 1,
        table: "posts",
        constraintName: "posts_user_id_fkey",
      };
      expect(addCheckConstraintRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
