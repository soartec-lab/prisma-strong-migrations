import { describe, it, expect } from "vite-plus/test";
import { enumValueRemovalRule } from "./enum-value-removal";
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

describe("enumValueRemovalRule", () => {
  describe("detect", () => {
    it("should detect ALTER TYPE ... RENAME TO ..._old", () => {
      const stmt: ParsedStatement = {
        type: "alterType",
        raw: 'ALTER TYPE "Role" RENAME TO "Role_old";',
        line: 1,
        typeName: "Role",
      };
      expect(enumValueRemovalRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect unrelated statement types", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" DROP COLUMN "name";',
        line: 1,
        action: "dropColumn",
        table: "users",
        column: "name",
      };
      expect(enumValueRemovalRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect CREATE TYPE (adding enum)", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: "CREATE TYPE \"Status\" AS ENUM ('ACTIVE', 'INACTIVE');",
        line: 1,
      };
      expect(enumValueRemovalRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include the enum type name", () => {
      const stmt: ParsedStatement = {
        type: "alterType",
        raw: 'ALTER TYPE "Role" RENAME TO "Role_old";',
        line: 1,
        typeName: "Role",
      };
      expect(enumValueRemovalRule.message(stmt)).toContain('"Role"');
    });

    it("should use generic message when typeName is missing", () => {
      const stmt: ParsedStatement = {
        type: "alterType",
        raw: "ALTER TYPE status RENAME TO status_old;",
        line: 1,
      };
      expect(enumValueRemovalRule.message(stmt)).toContain("enum type");
    });
  });

  describe("rule metadata", () => {
    it("should have error severity", () => {
      expect(enumValueRemovalRule.severity).toBe("error");
    });

    it("should have correct name", () => {
      expect(enumValueRemovalRule.name).toBe("enumValueRemoval");
    });
  });
});
