import { addColumnNotNull } from "../../src/checks/add-column-not-null";

describe("addColumnNotNull check", () => {
  it("detects ADD COLUMN … NOT NULL without DEFAULT", () => {
    expect(
      addColumnNotNull.detect(
        "ALTER TABLE users ADD COLUMN age INT NOT NULL",
      ),
    ).toBe(true);
  });

  it("does NOT trigger when DEFAULT is present", () => {
    expect(
      addColumnNotNull.detect(
        "ALTER TABLE users ADD COLUMN age INT NOT NULL DEFAULT 0",
      ),
    ).toBe(false);
  });

  it("does NOT trigger when column is nullable", () => {
    expect(
      addColumnNotNull.detect("ALTER TABLE users ADD COLUMN age INT"),
    ).toBe(false);
  });

  it("handles multi-column ADD COLUMN without NOT NULL", () => {
    expect(
      addColumnNotNull.detect(
        "ALTER TABLE users ADD COLUMN first_name TEXT, ADD COLUMN last_name TEXT",
      ),
    ).toBe(false);
  });

  it("triggers on one of multiple ADD COLUMN clauses having NOT NULL without DEFAULT", () => {
    expect(
      addColumnNotNull.detect(
        "ALTER TABLE users ADD COLUMN first_name TEXT, ADD COLUMN age INT NOT NULL",
      ),
    ).toBe(true);
  });

  it("does not trigger on unrelated statements", () => {
    expect(addColumnNotNull.detect("DROP TABLE users")).toBe(false);
    expect(addColumnNotNull.detect("CREATE INDEX idx ON users(email)")).toBe(false);
  });

  it("builds a violation with the correct fields", () => {
    const stmt = "ALTER TABLE users ADD COLUMN age INT NOT NULL";
    const v = addColumnNotNull.buildViolation(stmt, 2);
    expect(v.check).toBe("add_column_not_null");
    expect(v.line).toBe(2);
    expect(v.statement).toBe(stmt);
    expect(v.message).toContain("NOT NULL");
  });
});
