import { describe, it, expect } from "vite-plus/test";
import { addExclusionConstraintRule } from "./add-exclusion-constraint";
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

describe("addExclusionConstraintRule", () => {
  describe("detect", () => {
    it("should detect ADD EXCLUSION constraint", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addConstraint",
        constraintType: "exclusion",
        raw: 'ALTER TABLE "reservations" ADD CONSTRAINT "reservations_no_overlap" EXCLUDE USING gist (room_id WITH =, during WITH &&);',
        line: 1,
        table: "reservations",
        constraintName: "reservations_no_overlap",
      };
      expect(addExclusionConstraintRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ADD UNIQUE constraint", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addConstraint",
        constraintType: "unique",
        raw: 'ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");',
        line: 1,
        table: "users",
        constraintName: "users_email_unique",
      };
      expect(addExclusionConstraintRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
