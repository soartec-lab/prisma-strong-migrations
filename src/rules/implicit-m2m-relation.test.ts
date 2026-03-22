import { describe, it, expect } from "vite-plus/test";
import { implicitM2mRelationRule } from "./implicit-m2m-relation";
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

describe("implicitM2mRelationRule", () => {
  describe("detect", () => {
    it("should detect CREATE TABLE with _XToY pattern", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "_CategoryToPost" (\n    "A" integer NOT NULL,\n    "B" integer NOT NULL\n);',
        line: 1,
        table: "_CategoryToPost",
      };
      expect(implicitM2mRelationRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect different model name combinations", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "_AuthorToBook" ("A" integer NOT NULL, "B" integer NOT NULL);',
        line: 1,
        table: "_AuthorToBook",
      };
      expect(implicitM2mRelationRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect CREATE TABLE without _XToY pattern", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "users" ("id" SERIAL PRIMARY KEY);',
        line: 1,
        table: "users",
      };
      expect(implicitM2mRelationRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect explicit M2M table (no underscore prefix)", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "CategoryToPost" ("postId" INT, "categoryId" INT);',
        line: 1,
        table: "CategoryToPost",
      };
      expect(implicitM2mRelationRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect _prisma_migrations table", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "_prisma_migrations" ("id" TEXT PRIMARY KEY);',
        line: 1,
        table: "_prisma_migrations",
      };
      expect(implicitM2mRelationRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect ALTER TABLE on M2M table (handled by implicitM2mTableChange)", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "_CategoryToPost" ADD COLUMN "extra" TEXT;',
        line: 1,
        table: "_CategoryToPost",
        action: "addColumn",
      };
      expect(implicitM2mRelationRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include the table name", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "_CategoryToPost" ("A" integer NOT NULL, "B" integer NOT NULL);',
        line: 1,
        table: "_CategoryToPost",
      };
      expect(implicitM2mRelationRule.message(stmt)).toContain('"_CategoryToPost"');
    });
  });

  describe("suggestion", () => {
    it("should include model names derived from table name", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "_CategoryToPost" ("A" integer NOT NULL, "B" integer NOT NULL);',
        line: 1,
        table: "_CategoryToPost",
      };
      const suggestion = implicitM2mRelationRule.suggestion(stmt);
      expect(suggestion).toContain("Category");
      expect(suggestion).toContain("Post");
    });

    it("should include disable comment", () => {
      const stmt: ParsedStatement = {
        type: "createTable",
        raw: 'CREATE TABLE "_CategoryToPost" ("A" integer NOT NULL, "B" integer NOT NULL);',
        line: 1,
        table: "_CategoryToPost",
      };
      expect(implicitM2mRelationRule.suggestion(stmt)).toContain(
        "prisma-strong-migrations-disable-next-line implicitM2mRelation",
      );
    });
  });

  describe("rule metadata", () => {
    it("should have warning severity", () => {
      expect(implicitM2mRelationRule.severity).toBe("warning");
    });

    it("should have correct name", () => {
      expect(implicitM2mRelationRule.name).toBe("implicitM2mRelation");
    });

    it("should not have a fix method", () => {
      expect(implicitM2mRelationRule.fix).toBeUndefined();
    });
  });
});
