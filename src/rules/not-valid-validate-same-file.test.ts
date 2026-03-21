import { describe, it, expect } from "vite-plus/test";
import { notValidValidateSameFileRule } from "./not-valid-validate-same-file";
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

const validateStmt: ParsedStatement = {
  type: "validateConstraint",
  raw: 'ALTER TABLE "orders" VALIDATE CONSTRAINT "orders_user_id_fkey";',
  line: 2,
  table: "orders",
  constraintName: "orders_user_id_fkey",
};

const notValidStmt: ParsedStatement = {
  type: "alterTable",
  raw: 'ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") NOT VALID;',
  line: 1,
  table: "orders",
  action: "addConstraint",
  constraintType: "foreignKey",
  notValid: true,
};

describe("notValidValidateSameFileRule", () => {
  describe("detect", () => {
    it("should detect VALIDATE CONSTRAINT when NOT VALID is in same file", () => {
      const context = makeContext([notValidStmt, validateStmt]);
      expect(notValidValidateSameFileRule.detect(validateStmt, context)).toBe(true);
    });

    it("should not detect VALIDATE CONSTRAINT when NOT VALID is not in same file", () => {
      const context = makeContext([validateStmt]);
      expect(notValidValidateSameFileRule.detect(validateStmt, context)).toBe(false);
    });

    it("should not fire on alterTable statement", () => {
      const context = makeContext([notValidStmt, validateStmt]);
      expect(notValidValidateSameFileRule.detect(notValidStmt, context)).toBe(false);
    });

    it("should not fire on alterTable without notValid when validateConstraint present", () => {
      const validStmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
        line: 1,
        table: "users",
        action: "addColumn",
        notValid: false,
      };
      const context = makeContext([validStmt, validateStmt]);
      expect(notValidValidateSameFileRule.detect(validateStmt, context)).toBe(false);
    });
  });

  describe("message", () => {
    it("should mention VALIDATE CONSTRAINT and NOT VALID", () => {
      const msg = notValidValidateSameFileRule.message(validateStmt);
      expect(msg).toContain("VALIDATE CONSTRAINT");
      expect(msg).toContain("NOT VALID");
    });
  });

  describe("severity", () => {
    it("should be error", () => {
      expect(notValidValidateSameFileRule.severity).toBe("error");
    });
  });
});
