import { renameTable } from "../../src/checks/rename-table";

describe("renameTable check", () => {
  it("detects ALTER TABLE … RENAME TO", () => {
    expect(
      renameTable.detect("ALTER TABLE users RENAME TO accounts"),
    ).toBe(true);
  });

  it("detects RENAME TO (case-insensitive)", () => {
    expect(renameTable.detect("alter table users rename to accounts")).toBe(true);
  });

  it("does not trigger on RENAME COLUMN (handled by the renameColumn check)", () => {
    // The renameTable check looks for `RENAME TO` directly after RENAME,
    // not `RENAME COLUMN … TO`. The renameColumn check handles that case.
    const stmt = "ALTER TABLE users RENAME COLUMN email TO email_address";
    expect(renameTable.detect(stmt)).toBe(false);
  });

  it("does not trigger on unrelated statements", () => {
    expect(renameTable.detect("DROP TABLE users")).toBe(false);
    expect(renameTable.detect("SELECT 1")).toBe(false);
  });

  it("builds a violation with the correct fields", () => {
    const stmt = "ALTER TABLE users RENAME TO accounts";
    const v = renameTable.buildViolation(stmt, 1);
    expect(v.check).toBe("rename_table");
    expect(v.line).toBe(1);
    expect(v.statement).toBe(stmt);
    expect(v.message).toContain("Renaming a table");
  });
});
