import { parseStatements } from "../src/parser";

describe("parseStatements", () => {
  it("returns an empty array for empty input", () => {
    expect(parseStatements("")).toEqual([]);
    expect(parseStatements("   ")).toEqual([]);
    expect(parseStatements("\n\n")).toEqual([]);
  });

  it("parses a single statement terminated by a semicolon", () => {
    const results = parseStatements("SELECT 1;");
    expect(results).toHaveLength(1);
    expect(results[0].sql).toBe("SELECT 1");
    expect(results[0].line).toBe(1);
  });

  it("parses multiple statements", () => {
    const sql = "SELECT 1;\nSELECT 2;";
    const results = parseStatements(sql);
    expect(results).toHaveLength(2);
    expect(results[0].sql).toBe("SELECT 1");
    expect(results[1].sql).toBe("SELECT 2");
  });

  it("assigns the correct starting line number to each statement", () => {
    const sql = "SELECT 1;\n\nSELECT 2;";
    const results = parseStatements(sql);
    expect(results[0].line).toBe(1);
    expect(results[1].line).toBe(3);
  });

  it("strips single-line comments", () => {
    const sql = "-- This is a comment\nSELECT 1;";
    const results = parseStatements(sql);
    expect(results).toHaveLength(1);
    expect(results[0].sql).toBe("SELECT 1");
  });

  it("strips block comments while preserving line numbers", () => {
    const sql = "/* block\n   comment */\nSELECT 1;";
    const results = parseStatements(sql);
    expect(results).toHaveLength(1);
    expect(results[0].line).toBe(3);
  });

  it("handles a statement that spans multiple lines", () => {
    const sql = "ALTER TABLE users\n  ADD COLUMN email TEXT;";
    const results = parseStatements(sql);
    expect(results).toHaveLength(1);
    expect(results[0].sql).toContain("ADD COLUMN email TEXT");
  });

  it("handles trailing statement without semicolon", () => {
    const results = parseStatements("SELECT 1");
    expect(results).toHaveLength(1);
    expect(results[0].sql).toBe("SELECT 1");
  });
});
