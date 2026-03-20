import { setNotNull } from "../../src/checks/set-not-null";

describe("setNotNull check", () => {
  it("detects SET NOT NULL", () => {
    expect(
      setNotNull.detect("ALTER TABLE users ALTER COLUMN email SET NOT NULL"),
    ).toBe(true);
  });

  it("detects SET NOT NULL (case-insensitive)", () => {
    expect(
      setNotNull.detect("alter table users alter column email set not null"),
    ).toBe(true);
  });

  it("does not trigger on unrelated statements", () => {
    expect(setNotNull.detect("ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''")).toBe(
      false,
    );
    expect(setNotNull.detect("DROP TABLE users")).toBe(false);
    expect(setNotNull.detect("SELECT 1")).toBe(false);
  });

  it("builds a violation with the correct fields", () => {
    const stmt = "ALTER TABLE users ALTER COLUMN email SET NOT NULL";
    const v = setNotNull.buildViolation(stmt, 6);
    expect(v.check).toBe("set_not_null");
    expect(v.line).toBe(6);
    expect(v.statement).toBe(stmt);
    expect(v.message).toContain("NOT NULL");
  });
});
