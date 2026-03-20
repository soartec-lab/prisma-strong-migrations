import { addUniqueConstraint } from "../../src/checks/add-unique-constraint";

describe("addUniqueConstraint check", () => {
  it("detects ADD CONSTRAINT … UNIQUE", () => {
    expect(
      addUniqueConstraint.detect(
        "ALTER TABLE users ADD CONSTRAINT uq_email UNIQUE (email)",
      ),
    ).toBe(true);
  });

  it("detects ADD UNIQUE (without CONSTRAINT keyword)", () => {
    expect(
      addUniqueConstraint.detect("ALTER TABLE users ADD UNIQUE (email)"),
    ).toBe(true);
  });

  it("detects ADD UNIQUE (case-insensitive)", () => {
    expect(
      addUniqueConstraint.detect("alter table users add unique (email)"),
    ).toBe(true);
  });

  it("does NOT trigger on CREATE UNIQUE INDEX CONCURRENTLY", () => {
    expect(
      addUniqueConstraint.detect(
        "CREATE UNIQUE INDEX CONCURRENTLY idx_email ON users(email)",
      ),
    ).toBe(false);
  });

  it("does not trigger on unrelated statements", () => {
    expect(addUniqueConstraint.detect("DROP TABLE users")).toBe(false);
    expect(addUniqueConstraint.detect("SELECT 1")).toBe(false);
    expect(
      addUniqueConstraint.detect("ALTER TABLE users ADD COLUMN email TEXT"),
    ).toBe(false);
  });

  it("builds a violation with the correct fields", () => {
    const stmt = "ALTER TABLE users ADD CONSTRAINT uq_email UNIQUE (email)";
    const v = addUniqueConstraint.buildViolation(stmt, 8);
    expect(v.check).toBe("add_unique_constraint");
    expect(v.line).toBe(8);
    expect(v.statement).toBe(stmt);
    expect(v.message).toContain("UNIQUE");
  });
});
