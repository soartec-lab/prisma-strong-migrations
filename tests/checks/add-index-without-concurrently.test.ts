import { addIndexWithoutConcurrently } from "../../src/checks/add-index-without-concurrently";

describe("addIndexWithoutConcurrently check", () => {
  it("detects CREATE INDEX without CONCURRENTLY", () => {
    expect(
      addIndexWithoutConcurrently.detect("CREATE INDEX idx_email ON users(email)"),
    ).toBe(true);
  });

  it("detects CREATE UNIQUE INDEX without CONCURRENTLY", () => {
    expect(
      addIndexWithoutConcurrently.detect(
        "CREATE UNIQUE INDEX idx_email ON users(email)",
      ),
    ).toBe(true);
  });

  it("does NOT trigger on CREATE INDEX CONCURRENTLY", () => {
    expect(
      addIndexWithoutConcurrently.detect(
        "CREATE INDEX CONCURRENTLY idx_email ON users(email)",
      ),
    ).toBe(false);
  });

  it("does NOT trigger on CREATE UNIQUE INDEX CONCURRENTLY", () => {
    expect(
      addIndexWithoutConcurrently.detect(
        "CREATE UNIQUE INDEX CONCURRENTLY idx_email ON users(email)",
      ),
    ).toBe(false);
  });

  it("does not trigger on unrelated statements", () => {
    expect(addIndexWithoutConcurrently.detect("DROP INDEX idx_email")).toBe(false);
    expect(addIndexWithoutConcurrently.detect("SELECT 1")).toBe(false);
  });

  it("builds a violation with the correct fields", () => {
    const stmt = "CREATE INDEX idx_email ON users(email)";
    const v = addIndexWithoutConcurrently.buildViolation(stmt, 7);
    expect(v.check).toBe("add_index_without_concurrently");
    expect(v.line).toBe(7);
    expect(v.statement).toBe(stmt);
    expect(v.message).toContain("CONCURRENTLY");
  });
});
