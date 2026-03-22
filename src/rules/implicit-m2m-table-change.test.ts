import { describe, it, expect } from "vite-plus/test";
import { implicitM2mTableChangeRule } from "./implicit-m2m-table-change";
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

describe("implicitM2mTableChangeRule", () => {
  describe("detect", () => {
    it("should detect ALTER TABLE on implicit M2M table", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "_CategoryToPost" ADD COLUMN "extra" TEXT;',
        line: 1,
        table: "_CategoryToPost",
        action: "addColumn",
      };
      expect(implicitM2mTableChangeRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect DROP TABLE on implicit M2M table", () => {
      const stmt: ParsedStatement = {
        type: "dropTable",
        raw: 'DROP TABLE "_CategoryToPost";',
        line: 1,
        table: "_CategoryToPost",
      };
      expect(implicitM2mTableChangeRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect CREATE INDEX on implicit M2M table", () => {
      const stmt: ParsedStatement = {
        type: "createIndex",
        raw: 'CREATE INDEX ON "_CategoryToPost"("A");',
        line: 1,
        table: "_CategoryToPost",
        columns: ["A"],
        concurrently: false,
        unique: false,
      };
      expect(implicitM2mTableChangeRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should detect tables matching _XToY pattern with different names", () => {
      const stmt: ParsedStatement = {
        type: "dropTable",
        raw: 'DROP TABLE "_AuthorToBook";',
        line: 1,
        table: "_AuthorToBook",
      };
      expect(implicitM2mTableChangeRule.detect(stmt, mockContext)).toBe(true);
    });

    it("should not detect regular table operations", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "users" DROP COLUMN "name";',
        line: 1,
        table: "users",
        action: "dropColumn",
      };
      expect(implicitM2mTableChangeRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect explicit M2M table (no underscore prefix)", () => {
      const stmt: ParsedStatement = {
        type: "alterTable",
        raw: 'ALTER TABLE "CategoryToPost" ADD COLUMN "extra" TEXT;',
        line: 1,
        table: "CategoryToPost",
        action: "addColumn",
      };
      expect(implicitM2mTableChangeRule.detect(stmt, mockContext)).toBe(false);
    });

    it("should not detect tables that start with underscore but don't match M2M pattern", () => {
      const stmt: ParsedStatement = {
        type: "dropTable",
        raw: 'DROP TABLE "_prisma_migrations";',
        line: 1,
        table: "_prisma_migrations",
      };
      expect(implicitM2mTableChangeRule.detect(stmt, mockContext)).toBe(false);
    });
  });

  describe("message", () => {
    it("should include the table name", () => {
      const stmt: ParsedStatement = {
        type: "dropTable",
        raw: 'DROP TABLE "_CategoryToPost";',
        line: 1,
        table: "_CategoryToPost",
      };
      expect(implicitM2mTableChangeRule.message(stmt)).toContain('"_CategoryToPost"');
    });
  });

  describe("rule metadata", () => {
    it("should have error severity", () => {
      expect(implicitM2mTableChangeRule.severity).toBe("error");
    });

    it("should have correct name", () => {
      expect(implicitM2mTableChangeRule.name).toBe("implicitM2mTableChange");
    });
  });
});
