import { describe, it, expect } from "vite-plus/test";
import { renameSchemaRule } from "./rename-schema";
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

describe("renameSchemaRule", () => {
  describe("detect", () => {
    it("should detect ALTER SCHEMA RENAME TO", () => {
      const stmt: ParsedStatement = {
        type: "alterSchema",
        raw: 'ALTER SCHEMA "public" RENAME TO "app";',
        line: 1,
      };
      expect(renameSchemaRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ALTER TABLE statement", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "renameTable",
        raw: 'ALTER TABLE "users" RENAME TO "accounts";',
        line: 1,
        table: "users",
      };
      expect(renameSchemaRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect createIndex statement", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX "idx" ON "users"("email");',
        line: 1,
      };
      expect(renameSchemaRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
