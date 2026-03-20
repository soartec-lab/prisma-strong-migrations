import { describe, it, expect } from "vite-plus/test";
import { parseSql } from "./sql-parser";

describe("parseSql", () => {
  describe("ALTER TABLE", () => {
    it("DROP COLUMN → dropColumn", () => {
      const results = parseSql(`ALTER TABLE "users" DROP COLUMN "name";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "dropColumn",
        table: "users",
        column: "name",
        line: 1,
      });
    });

    it("ADD COLUMN → addColumn with dataType", () => {
      const results = parseSql(`ALTER TABLE "users" ADD COLUMN "email" text;`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "addColumn",
        table: "users",
        column: "email",
        dataType: "text",
      });
    });

    it("RENAME COLUMN → renameColumn", () => {
      const results = parseSql(`ALTER TABLE "users" RENAME COLUMN "name" TO "full_name";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "renameColumn",
        table: "users",
        column: "name",
      });
    });

    it("ALTER COLUMN TYPE → alterColumnType", () => {
      const results = parseSql(`ALTER TABLE "users" ALTER COLUMN "age" TYPE bigint;`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "alterColumnType",
        table: "users",
        column: "age",
        dataType: "bigint",
      });
    });

    it("SET NOT NULL → alterColumnSetNotNull", () => {
      const results = parseSql(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "alterColumnSetNotNull",
        table: "users",
        column: "email",
      });
    });

    it("ADD CONSTRAINT FOREIGN KEY → addConstraint, foreignKey", () => {
      const results = parseSql(
        `ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");`,
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "addConstraint",
        constraintType: "foreignKey",
        table: "posts",
      });
      expect(results[0].notValid).toBeUndefined();
    });

    it("ADD CONSTRAINT CHECK NOT VALID → notValid: true", () => {
      const results = parseSql(
        `ALTER TABLE "users" ADD CONSTRAINT "users_age_check" CHECK (age > 0) NOT VALID;`,
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "addConstraint",
        constraintType: "check",
        table: "users",
        notValid: true,
      });
    });

    it("ADD CONSTRAINT UNIQUE → addConstraint, unique", () => {
      const results = parseSql(
        `ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");`,
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "addConstraint",
        constraintType: "unique",
        table: "users",
      });
    });

    it("ADD CONSTRAINT EXCLUDE → addConstraint, exclusion", () => {
      const results = parseSql(
        `ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist (room WITH =, during WITH &&);`,
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "addConstraint",
        constraintType: "exclusion",
        table: "bookings",
      });
    });

    it("RENAME TO → renameTable", () => {
      const results = parseSql(`ALTER TABLE "users" RENAME TO "accounts";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterTable",
        action: "renameTable",
        table: "users",
      });
    });
  });

  describe("CREATE INDEX", () => {
    it("without CONCURRENTLY → concurrently: false", () => {
      const results = parseSql(`CREATE INDEX "users_email_idx" ON "users"("email");`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "createIndex",
        table: "users",
        indexName: "users_email_idx",
        concurrently: false,
        unique: false,
      });
    });

    it("with CONCURRENTLY → concurrently: true", () => {
      const results = parseSql(`CREATE INDEX CONCURRENTLY "users_email_idx" ON "users"("email");`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "createIndex",
        concurrently: true,
      });
    });

    it("UNIQUE → unique: true", () => {
      const results = parseSql(`CREATE UNIQUE INDEX "users_email_key" ON "users"("email");`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "createIndex",
        unique: true,
        concurrently: false,
      });
    });

    it("includes columns list", () => {
      const results = parseSql(`CREATE INDEX "idx" ON "users"("first_name", "last_name");`);
      expect(results[0].columns).toEqual(["first_name", "last_name"]);
    });
  });

  describe("DROP INDEX", () => {
    it("without CONCURRENTLY → concurrently: false", () => {
      const results = parseSql(`DROP INDEX "users_email_idx";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "dropIndex",
        indexName: "users_email_idx",
        concurrently: false,
      });
    });

    it("with CONCURRENTLY → concurrently: true", () => {
      const results = parseSql(`DROP INDEX CONCURRENTLY "users_email_idx";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "dropIndex",
        concurrently: true,
      });
    });
  });

  describe("disable comment", () => {
    it("disable-next-line → disabled populated for next stmt", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results).toHaveLength(1);
      expect(results[0].disabled).toEqual(["remove_column"]);
    });

    it("multiple rules in comment → array", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column rename_column
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual(["remove_column", "rename_column"]);
    });

    it("no rule name → disable all (empty array)", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual([]);
    });

    it("comment not before statement → no disabled", () => {
      const sql = `ALTER TABLE "users" DROP COLUMN "name";
-- prisma-strong-migrations-disable-next-line remove_column
ALTER TABLE "users" ADD COLUMN "email" text;`;
      const results = parseSql(sql);
      expect(results[0].disabled).toBeUndefined();
      expect(results[1].disabled).toEqual(["remove_column"]);
    });

    it("reason after -- is captured in disableReason", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column -- コード削除済み
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual(["remove_column"]);
      expect(results[0].disableReason).toBe("コード削除済み");
    });

    it("no reason → disableReason is undefined", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual(["remove_column"]);
      expect(results[0].disableReason).toBeUndefined();
    });

    it("reason with multiple rules on one line", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column, rename_column -- デプロイ完了後に適用
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual(["remove_column", "rename_column"]);
      expect(results[0].disableReason).toBe("デプロイ完了後に適用");
    });

    it("multiple disable comment lines merged for same statement", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column -- コード削除済み
-- prisma-strong-migrations-disable-next-line rename_column -- 後方互換性のため
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual(["remove_column", "rename_column"]);
      expect(results[0].disableReason).toBe("コード削除済み, 後方互換性のため");
    });

    it("multiple disable comment lines without reason merged correctly", () => {
      const sql = `-- prisma-strong-migrations-disable-next-line remove_column
-- prisma-strong-migrations-disable-next-line rename_column
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].disabled).toEqual(["remove_column", "rename_column"]);
      expect(results[0].disableReason).toBeUndefined();
    });
  });

  describe("line numbers", () => {
    it("assigns correct line number to each statement", () => {
      const sql = `ALTER TABLE "users" DROP COLUMN "name";
ALTER TABLE "posts" DROP COLUMN "title";`;
      const results = parseSql(sql);
      expect(results[0].line).toBe(1);
      expect(results[1].line).toBe(2);
    });

    it("accounts for multi-line statements", () => {
      const sql = `ALTER TABLE "posts"
  ADD CONSTRAINT "posts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id");
ALTER TABLE "users" DROP COLUMN "name";`;
      const results = parseSql(sql);
      expect(results[0].line).toBe(1);
      expect(results[1].line).toBe(4);
    });
  });

  describe("multiple statements", () => {
    it("parses multiple statements from one file", () => {
      const sql = `ALTER TABLE "users" DROP COLUMN "name";
ALTER TABLE "posts" RENAME COLUMN "title" TO "subject";
CREATE INDEX CONCURRENTLY "idx" ON "orders"("status");`;
      const results = parseSql(sql);
      expect(results).toHaveLength(3);
      expect(results[0].action).toBe("dropColumn");
      expect(results[1].action).toBe("renameColumn");
      expect(results[2].type).toBe("createIndex");
    });
  });

  describe("ALTER SCHEMA", () => {
    it("RENAME TO → alterSchema", () => {
      const results = parseSql(`ALTER SCHEMA "public" RENAME TO "private";`);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "alterSchema",
      });
    });
  });
});
