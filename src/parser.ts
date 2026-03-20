/**
 * Splits a SQL migration file into individual statements, stripping comments
 * and blank lines. Each element is the trimmed statement text; the returned
 * positions map back to the 1-based line number where that statement starts.
 */
export function parseStatements(sql: string): Array<{ sql: string; line: number }> {
  const results: Array<{ sql: string; line: number }> = [];

  // Remove block comments (/* ... */) while preserving line count so that
  // line numbers stay accurate.
  const withoutBlockComments = sql.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    match.replace(/[^\n]/g, " "),
  );

  const lines = withoutBlockComments.split("\n");
  let currentParts: string[] = [];
  // Lazily set to the first line that contributes content to the current statement.
  let statementStartLine: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];

    // Strip single-line comments (-- ...) for analysis but keep the newline.
    const strippedLine = line.replace(/--.*$/, "");

    // A line may contain a semicolon (end of statement) — possibly multiple.
    const parts = strippedLine.split(";");

    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];
      const isEndOfStatement = p < parts.length - 1;

      if (isEndOfStatement) {
        // This part is terminated by a semicolon.
        if (part.trim().length > 0 && statementStartLine === null) {
          statementStartLine = lineNumber;
        }
        currentParts.push(part);
        const statementSql = currentParts.join("\n").trim();
        if (statementSql.length > 0) {
          results.push({ sql: statementSql, line: statementStartLine ?? lineNumber });
        }
        // Reset for the next statement.
        currentParts = [];
        statementStartLine = null;
      } else {
        // Last segment on this line (no semicolon following it).
        if (part.trim().length > 0) {
          if (statementStartLine === null) {
            statementStartLine = lineNumber;
          }
          currentParts.push(part);
        } else if (currentParts.length > 0) {
          // Preserve blank continuation lines so multi-line statements reconstruct correctly.
          currentParts.push(part);
        }
      }
    }
  }

  // Handle trailing statement without a trailing semicolon.
  const remaining = currentParts.join("\n").trim();
  if (remaining.length > 0) {
    results.push({ sql: remaining, line: statementStartLine ?? 1 });
  }

  return results;
}
