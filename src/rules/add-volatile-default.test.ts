import { describe, it, expect } from "vite-plus/test";
import { addVolatileDefaultRule } from "./add-volatile-default";
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

describe("addVolatileDefaultRule", () => {
  describe("detect", () => {
    it("should detect ADD COLUMN with gen_random_uuid() default", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "token" uuid DEFAULT gen_random_uuid();',
        line: 1,
        table: "users",
        column: "token",
        dataType: "uuid",
      };
      expect(addVolatileDefaultRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect ADD COLUMN with now() default", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "created_at" timestamp DEFAULT now();',
        line: 1,
        table: "users",
        column: "created_at",
        dataType: "timestamp",
      };
      expect(addVolatileDefaultRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect ADD COLUMN with random() default", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "score" float DEFAULT random();',
        line: 1,
        table: "users",
        column: "score",
        dataType: "float",
      };
      expect(addVolatileDefaultRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect ADD COLUMN with static default", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "status" text DEFAULT \'active\';',
        line: 1,
        table: "users",
        column: "status",
        dataType: "text",
      };
      expect(addVolatileDefaultRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect ADD COLUMN without default", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        action: "addColumn",
        raw: 'ALTER TABLE "users" ADD COLUMN "name" text;',
        line: 1,
        table: "users",
        column: "name",
        dataType: "text",
      };
      expect(addVolatileDefaultRule.detect(stmt, mockContext)).toBe(false);
    });
  });
});
