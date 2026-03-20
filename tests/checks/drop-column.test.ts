import { dropColumn } from "../../src/checks/drop-column";

describe("dropColumn check", () => {
  it("detects DROP COLUMN", () => {
    expect(dropColumn.detect("ALTER TABLE users DROP COLUMN email")).toBe(true);
  });

  it("detects DROP COLUMN (case-insensitive)", () => {
    expect(dropColumn.detect("alter table users drop column email")).toBe(true);
  });

  it("does not trigger on unrelated statements", () => {
    expect(dropColumn.detect("ALTER TABLE users ADD COLUMN email TEXT")).toBe(false);
    expect(dropColumn.detect("DROP TABLE users")).toBe(false);
    expect(dropColumn.detect("SELECT * FROM users")).toBe(false);
  });

  it("builds a violation with the correct fields", () => {
    const stmt = "ALTER TABLE users DROP COLUMN email";
    const v = dropColumn.buildViolation(stmt, 5);
    expect(v.check).toBe("drop_column");
    expect(v.line).toBe(5);
    expect(v.statement).toBe(stmt);
    expect(v.message).toContain("Dropping a column");
  });
});
