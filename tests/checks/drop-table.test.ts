import { dropTable } from "../../src/checks/drop-table";

describe("dropTable check", () => {
  it("detects DROP TABLE", () => {
    expect(dropTable.detect("DROP TABLE users")).toBe(true);
  });

  it("detects DROP TABLE IF EXISTS", () => {
    expect(dropTable.detect("DROP TABLE IF EXISTS users")).toBe(true);
  });

  it("detects DROP TABLE (case-insensitive)", () => {
    expect(dropTable.detect("drop table users")).toBe(true);
  });

  it("does not trigger on unrelated statements", () => {
    expect(dropTable.detect("CREATE TABLE users (id INT)")).toBe(false);
    expect(dropTable.detect("ALTER TABLE users DROP COLUMN email")).toBe(false);
    expect(dropTable.detect("SELECT * FROM users")).toBe(false);
  });

  it("builds a violation with the correct fields", () => {
    const stmt = "DROP TABLE users";
    const v = dropTable.buildViolation(stmt, 3);
    expect(v.check).toBe("drop_table");
    expect(v.line).toBe(3);
    expect(v.statement).toBe(stmt);
    expect(v.message).toContain("Dropping a table");
  });
});
