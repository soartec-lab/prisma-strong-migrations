import { changeColumnType } from "../../src/checks/change-column-type";

describe("changeColumnType check", () => {
  it("detects ALTER COLUMN … TYPE", () => {
    expect(
      changeColumnType.detect(
        "ALTER TABLE users ALTER COLUMN age TYPE BIGINT",
      ),
    ).toBe(true);
  });

  it("detects ALTER COLUMN … SET DATA TYPE", () => {
    expect(
      changeColumnType.detect(
        "ALTER TABLE users ALTER COLUMN age SET DATA TYPE BIGINT",
      ),
    ).toBe(true);
  });

  it("detects case-insensitive variants", () => {
    expect(
      changeColumnType.detect(
        "alter table users alter column age type bigint",
      ),
    ).toBe(true);
  });

  it("does not trigger on unrelated statements", () => {
    expect(changeColumnType.detect("ALTER TABLE users ADD COLUMN age INT")).toBe(
      false,
    );
    expect(changeColumnType.detect("DROP TABLE users")).toBe(false);
    expect(changeColumnType.detect("SELECT 1")).toBe(false);
  });

  it("builds a violation with the correct fields", () => {
    const stmt = "ALTER TABLE users ALTER COLUMN age TYPE BIGINT";
    const v = changeColumnType.buildViolation(stmt, 4);
    expect(v.check).toBe("change_column_type");
    expect(v.line).toBe(4);
    expect(v.statement).toBe(stmt);
    expect(v.message).toContain("table rewrite");
  });
});
