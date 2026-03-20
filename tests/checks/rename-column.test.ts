import { renameColumn } from "../../src/checks/rename-column";

describe("renameColumn check", () => {
  it("detects RENAME COLUMN", () => {
    expect(
      renameColumn.detect("ALTER TABLE users RENAME COLUMN email TO email_address"),
    ).toBe(true);
  });

  it("detects RENAME COLUMN (case-insensitive)", () => {
    expect(
      renameColumn.detect("alter table users rename column email to email_address"),
    ).toBe(true);
  });

  it("does not trigger on RENAME TO (table rename)", () => {
    // RENAME COLUMN must be present; a bare RENAME TO is a different check.
    expect(renameColumn.detect("ALTER TABLE users RENAME TO accounts")).toBe(false);
  });

  it("does not trigger on unrelated statements", () => {
    expect(renameColumn.detect("ALTER TABLE users DROP COLUMN email")).toBe(false);
    expect(renameColumn.detect("SELECT 1")).toBe(false);
  });

  it("builds a violation with the correct fields", () => {
    const stmt = "ALTER TABLE users RENAME COLUMN email TO email_address";
    const v = renameColumn.buildViolation(stmt, 10);
    expect(v.check).toBe("rename_column");
    expect(v.line).toBe(10);
    expect(v.statement).toBe(stmt);
    expect(v.message).toContain("Renaming a column");
  });
});
