import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  checkMigrationSql,
  checkMigrationFile,
  checkMigrationsDir,
} from "../src/checker";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "strong-prisma-test-"));
}

function writeSql(dir: string, name: string, content: string): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

// ---------------------------------------------------------------------------
// checkMigrationSql
// ---------------------------------------------------------------------------

describe("checkMigrationSql", () => {
  it("returns no violations for a safe migration", () => {
    const sql = `
      CREATE TABLE users (
        id   SERIAL PRIMARY KEY,
        name TEXT
      );
      ALTER TABLE users ADD COLUMN email TEXT;
      CREATE INDEX CONCURRENTLY idx_email ON users(email);
    `;
    const result = checkMigrationSql(sql, "migration.sql");
    expect(result.filePath).toBe("migration.sql");
    expect(result.violations).toHaveLength(0);
  });

  it("detects DROP COLUMN", () => {
    const sql = "ALTER TABLE users DROP COLUMN email;";
    const result = checkMigrationSql(sql);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].check).toBe("drop_column");
  });

  it("detects DROP TABLE", () => {
    const sql = "DROP TABLE users;";
    const result = checkMigrationSql(sql);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].check).toBe("drop_table");
  });

  it("detects CREATE INDEX without CONCURRENTLY", () => {
    const sql = "CREATE INDEX idx_email ON users(email);";
    const result = checkMigrationSql(sql);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].check).toBe("add_index_without_concurrently");
  });

  it("does NOT flag CREATE INDEX CONCURRENTLY", () => {
    const sql = "CREATE INDEX CONCURRENTLY idx_email ON users(email);";
    const result = checkMigrationSql(sql);
    expect(result.violations).toHaveLength(0);
  });

  it("detects ADD COLUMN NOT NULL without DEFAULT", () => {
    const sql = "ALTER TABLE users ADD COLUMN age INT NOT NULL;";
    const result = checkMigrationSql(sql);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].check).toBe("add_column_not_null");
  });

  it("detects ALTER COLUMN TYPE", () => {
    const sql = "ALTER TABLE users ALTER COLUMN age TYPE BIGINT;";
    const result = checkMigrationSql(sql);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].check).toBe("change_column_type");
  });

  it("detects RENAME COLUMN", () => {
    const sql =
      "ALTER TABLE users RENAME COLUMN email TO email_address;";
    const result = checkMigrationSql(sql);
    const checks = result.violations.map((v: { check: string }) => v.check);
    expect(checks).toContain("rename_column");
  });

  it("detects RENAME TABLE", () => {
    const sql = "ALTER TABLE users RENAME TO accounts;";
    const result = checkMigrationSql(sql);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].check).toBe("rename_table");
  });

  it("detects SET NOT NULL", () => {
    const sql = "ALTER TABLE users ALTER COLUMN email SET NOT NULL;";
    const result = checkMigrationSql(sql);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].check).toBe("set_not_null");
  });

  it("detects ADD UNIQUE CONSTRAINT", () => {
    const sql =
      "ALTER TABLE users ADD CONSTRAINT uq_email UNIQUE (email);";
    const result = checkMigrationSql(sql);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].check).toBe("add_unique_constraint");
  });

  it("reports correct line numbers for multi-statement migrations", () => {
    const sql = [
      "ALTER TABLE users ADD COLUMN name TEXT;",
      "ALTER TABLE users DROP COLUMN email;",
    ].join("\n");
    const result = checkMigrationSql(sql);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].check).toBe("drop_column");
    expect(result.violations[0].line).toBe(2);
  });

  it("accepts a custom set of checks", () => {
    const sql = "DROP TABLE users; ALTER TABLE users DROP COLUMN email;";
    // Run only the drop_table check — drop_column should be ignored.
    const { dropTable } = require("../src/checks/drop-table");
    const result = checkMigrationSql(sql, "<test>", [dropTable]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].check).toBe("drop_table");
  });
});

// ---------------------------------------------------------------------------
// checkMigrationFile
// ---------------------------------------------------------------------------

describe("checkMigrationFile", () => {
  it("reads a file and returns its violations", () => {
    const dir = makeTmpDir();
    const filePath = writeSql(dir, "migration.sql", "DROP TABLE users;");
    const result = checkMigrationFile(filePath);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].check).toBe("drop_table");
  });

  it("returns no violations for a safe file", () => {
    const dir = makeTmpDir();
    const filePath = writeSql(dir, "migration.sql", "CREATE TABLE users (id SERIAL);");
    const result = checkMigrationFile(filePath);
    expect(result.violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkMigrationsDir
// ---------------------------------------------------------------------------

describe("checkMigrationsDir", () => {
  it("checks all .sql files in the directory", () => {
    const dir = makeTmpDir();
    writeSql(dir, "001_safe.sql", "CREATE TABLE users (id SERIAL);");
    writeSql(dir, "002_unsafe.sql", "DROP TABLE users;");
    const results = checkMigrationsDir(dir);
    expect(results).toHaveLength(2);
    const unsafe = results.find((r: { violations: unknown[] }) => r.violations.length > 0);
    expect(unsafe).toBeDefined();
    expect(unsafe!.violations[0].check).toBe("drop_table");
  });

  it("ignores non-.sql files", () => {
    const dir = makeTmpDir();
    writeSql(dir, "migration.sql", "DROP TABLE users;");
    fs.writeFileSync(path.join(dir, "README.md"), "# readme");
    const results = checkMigrationsDir(dir);
    expect(results).toHaveLength(1);
  });

  it("recurses into subdirectories", () => {
    const dir = makeTmpDir();
    const subDir = path.join(dir, "20240101_init");
    fs.mkdirSync(subDir);
    writeSql(subDir, "migration.sql", "DROP TABLE users;");
    const results = checkMigrationsDir(dir);
    expect(results).toHaveLength(1);
    expect(results[0].violations[0].check).toBe("drop_table");
  });

  it("returns an empty array when no .sql files are found", () => {
    const dir = makeTmpDir();
    const results = checkMigrationsDir(dir);
    expect(results).toHaveLength(0);
  });
});
