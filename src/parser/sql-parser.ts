import { parseWithComments } from "pgsql-ast-parser";
import type {
  Statement,
  AlterTableStatement,
  CreateIndexStatement,
  DropStatement,
  DataTypeDef,
} from "pgsql-ast-parser";
import type { ParsedStatement, ConstraintType } from "./types";

// ---- Constants ----

const DISABLE_COMMENT_PATTERN =
  /--\s*prisma-strong-migrations-disable-next-line\s*([\w,\s]*)(?:--\s*(.+))?/;

const DISABLE_TRANSACTION_PATTERN = /--\s*prisma-migrate-disable-next-transaction/i;

const NOT_VALID_PATTERN = /\bNOT\s+VALID\b/i;

// Matches a quoted identifier ("foo") or an unquoted identifier (foo)
const IDENT_PATTERN = `(?:"([^"]+)"|([^\\s(]+))`;
const ALTER_TABLE_PATTERN = new RegExp(`ALTER\\s+TABLE\\s+${IDENT_PATTERN}`, "i");
const ADD_CONSTRAINT_PATTERN = new RegExp(`ADD\\s+CONSTRAINT\\s+${IDENT_PATTERN}`, "i");

// ---- Line number helpers ----

/** Return the 1-based line number of a given character offset in `sql`. */
function lineNumberAt(offset: number, sql: string): number {
  return sql.slice(0, offset).split("\n").length;
}

// ---- Disable-comment map ----

type DisableEntry = { rules: string[]; reason?: string };

/**
 * Scan SQL for disable-next-line comments.
 * Returns a map of { line number of the NEXT line → DisableEntry }.
 * An empty rules array means "disable all rules".
 * Multiple disable comments targeting the same statement are merged.
 */
function buildDisableMap(sql: string): Map<number, DisableEntry> {
  const map = new Map<number, DisableEntry>();
  const lines = sql.split("\n");

  lines.forEach((lineText, lineIndex) => {
    const match = lineText.match(DISABLE_COMMENT_PATTERN);
    if (!match) return;

    const rulesText = match[1].trim();
    const rules = rulesText ? rulesText.split(/[\s,]+/).filter(Boolean) : [];
    const reason = match[2]?.trim() || undefined;

    // Skip over any consecutive disable-next-line comments to find the target SQL line
    let targetIndex = lineIndex + 1;
    while (targetIndex < lines.length && DISABLE_COMMENT_PATTERN.test(lines[targetIndex])) {
      targetIndex++;
    }
    const targetLineNumber = targetIndex + 1; // convert to 1-based

    const existing = map.get(targetLineNumber);
    if (existing) {
      existing.rules.push(...rules);
      if (reason) {
        existing.reason = existing.reason ? `${existing.reason}, ${reason}` : reason;
      }
    } else {
      map.set(targetLineNumber, { rules, reason });
    }
  });

  return map;
}

// ---- Data type helpers ----

function getDataTypeName(dataType: DataTypeDef): string {
  if (dataType.kind === "array") return getDataTypeName(dataType.arrayOf) + "[]";
  return (dataType as { name: string }).name.toLowerCase();
}

// ---- Constraint type mapping ----

const CONSTRAINT_TYPE_MAP: Record<string, ConstraintType> = {
  "foreign key": "foreignKey",
  check: "check",
  unique: "unique",
};

// ---- AST → ParsedStatement converters ----

function convertAlterColumn(
  statement: AlterTableStatement,
  raw: string,
  line: number,
): ParsedStatement | null {
  const change = statement.changes[0];
  if (change.type !== "alter column") return null;

  const table = statement.table.name;
  const column = change.column.name;
  const alteration = change.alter;

  if (alteration.type === "set type") {
    return {
      type: "alterTable",
      raw,
      line,
      table,
      action: "alterColumnType",
      column,
      dataType: getDataTypeName(alteration.dataType),
    };
  }
  if (alteration.type === "set not null") {
    return { type: "alterTable", raw, line, table, action: "alterColumnSetNotNull", column };
  }
  if (alteration.type === "set default") {
    return { type: "alterTable", raw, line, table, action: "alterColumnSetDefault", column };
  }
  return null;
}

function convertAlterTable(
  statement: AlterTableStatement,
  raw: string,
  line: number,
): ParsedStatement | null {
  const table = statement.table.name;
  const change = statement.changes[0];
  if (!change) return null;

  switch (change.type) {
    case "add column": {
      const constraints = change.column.constraints ?? [];
      const notNull = constraints.some((c) => c.type === "not null");
      const hasDefault = constraints.some((c) => c.type === "default");
      return {
        type: "alterTable",
        raw,
        line,
        table,
        action: "addColumn",
        column: change.column.name.name,
        dataType: getDataTypeName(change.column.dataType),
        ...(notNull ? { notNull: true } : {}),
        ...(hasDefault ? { hasDefault: true } : {}),
      };
    }

    case "drop column":
      return {
        type: "alterTable",
        raw,
        line,
        table,
        action: "dropColumn",
        column: change.column.name,
      };

    case "rename column":
      return {
        type: "alterTable",
        raw,
        line,
        table,
        action: "renameColumn",
        column: change.column.name,
      };

    case "alter column":
      return convertAlterColumn(statement, raw, line);

    case "add constraint": {
      const constraintType = CONSTRAINT_TYPE_MAP[change.constraint.type];
      if (!constraintType) return null;
      return {
        type: "alterTable",
        raw,
        line,
        table,
        action: "addConstraint",
        constraintType,
        constraintName: change.constraint.constraintName?.name,
        ...(NOT_VALID_PATTERN.test(raw) ? { notValid: true } : {}),
      };
    }

    case "rename":
      return { type: "alterTable", raw, line, table, action: "renameTable" };

    default:
      return null;
  }
}

function convertCreateIndex(
  statement: CreateIndexStatement,
  raw: string,
  line: number,
): ParsedStatement {
  const columns = statement.expressions
    .map((indexExpr) =>
      indexExpr.expression.type === "ref" ? (indexExpr.expression.name as string) : "",
    )
    .filter(Boolean);

  return {
    type: "createIndex",
    raw,
    line,
    table: statement.table.name,
    indexName: statement.indexName?.name,
    columns,
    concurrently: !!statement.concurrently,
    unique: !!statement.unique,
  };
}

function convertDropIndex(statement: DropStatement, raw: string, line: number): ParsedStatement {
  return {
    type: "dropIndex",
    raw,
    line,
    indexName: statement.names[0]?.name,
    concurrently: !!statement.concurrently,
  };
}

function convertDropTable(statement: DropStatement, raw: string, line: number): ParsedStatement {
  return {
    type: "dropTable",
    raw,
    line,
    table: statement.names[0]?.name,
  };
}

function convertStatement(statement: Statement, raw: string, line: number): ParsedStatement | null {
  switch (statement.type) {
    case "alter table":
      return convertAlterTable(statement as AlterTableStatement, raw, line);
    case "create index":
      return convertCreateIndex(statement as CreateIndexStatement, raw, line);
    case "drop index":
      return convertDropIndex(statement as DropStatement, raw, line);
    case "drop table":
      return convertDropTable(statement as DropStatement, raw, line);
    default:
      return null;
  }
}

// ---- Regex fallback for constructs pgsql-ast-parser doesn't support ----
// (EXCLUDE constraints, NOT VALID, ALTER SCHEMA RENAME)

/** Extract the identifier value from a regex match using the IDENT_PATTERN groups. */
function extractIdentifier(match: RegExpMatchArray): string | undefined {
  return match[1] ?? match[2]; // group 1 = quoted, group 2 = unquoted
}

function matchAlterSchemaRename(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*ALTER\s+SCHEMA\s+/i.test(sql)) return null;
  if (!/\bRENAME\s+TO\b/i.test(sql)) return null;
  return { type: "alterSchema", raw: sql, line };
}

function matchAddConstraintNotValid(sql: string, line: number): ParsedStatement | null {
  if (!/\bADD\s+CONSTRAINT\b/i.test(sql)) return null;
  if (!NOT_VALID_PATTERN.test(sql)) return null;

  let constraintType: ConstraintType;
  if (/\bFOREIGN\s+KEY\b/i.test(sql)) constraintType = "foreignKey";
  else if (/\bCHECK\b/i.test(sql)) constraintType = "check";
  else if (/\bUNIQUE\b/i.test(sql)) constraintType = "unique";
  else return null;

  const tableMatch = sql.match(ALTER_TABLE_PATTERN);
  const constraintMatch = sql.match(ADD_CONSTRAINT_PATTERN);

  return {
    type: "alterTable",
    raw: sql,
    line,
    table: tableMatch ? extractIdentifier(tableMatch) : undefined,
    action: "addConstraint",
    constraintType,
    constraintName: constraintMatch ? extractIdentifier(constraintMatch) : undefined,
    notValid: true,
  };
}

function matchAddExcludeConstraint(sql: string, line: number): ParsedStatement | null {
  if (!/\bADD\s+CONSTRAINT\b/i.test(sql)) return null;
  if (!/\bEXCLUDE\b/i.test(sql)) return null;

  const tableMatch = sql.match(ALTER_TABLE_PATTERN);
  const constraintMatch = sql.match(ADD_CONSTRAINT_PATTERN);

  return {
    type: "alterTable",
    raw: sql,
    line,
    table: tableMatch ? extractIdentifier(tableMatch) : undefined,
    action: "addConstraint",
    constraintType: "exclusion",
    constraintName: constraintMatch ? extractIdentifier(constraintMatch) : undefined,
  };
}

function matchTruncateTable(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*TRUNCATE\b/i.test(sql)) return null;
  const match = sql.match(new RegExp(`TRUNCATE\\s+(?:TABLE\\s+)?${IDENT_PATTERN}`, "i"));
  return {
    type: "truncateTable",
    raw: sql,
    line,
    table: match ? (match[1] ?? match[2]) : undefined,
  };
}

function matchSetTablespace(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*ALTER\s+TABLE\b/i.test(sql)) return null;
  if (!/\bSET\s+TABLESPACE\b/i.test(sql)) return null;
  const tableMatch = sql.match(ALTER_TABLE_PATTERN);
  return {
    type: "setTablespace",
    raw: sql,
    line,
    table: tableMatch ? extractIdentifier(tableMatch) : undefined,
  };
}

function matchClusterTable(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*CLUSTER\b/i.test(sql)) return null;
  const match = sql.match(new RegExp(`CLUSTER\\s+${IDENT_PATTERN}`, "i"));
  return {
    type: "clusterTable",
    raw: sql,
    line,
    table: match ? (match[1] ?? match[2]) : undefined,
  };
}

function matchDisableTrigger(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*ALTER\s+TABLE\b/i.test(sql)) return null;
  if (!/\bDISABLE\s+TRIGGER\b/i.test(sql)) return null;
  const tableMatch = sql.match(ALTER_TABLE_PATTERN);
  return {
    type: "disableTrigger",
    raw: sql,
    line,
    table: tableMatch ? extractIdentifier(tableMatch) : undefined,
  };
}

function matchCreateTableAsSelect(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*CREATE\s+TABLE\b/i.test(sql)) return null;
  if (!/\bAS\s+SELECT\b/i.test(sql)) return null;
  const match = sql.match(
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${IDENT_PATTERN}`, "i"),
  );
  return {
    type: "createTableAsSelect",
    raw: sql,
    line,
    table: match ? (match[1] ?? match[2]) : undefined,
  };
}

function matchVacuum(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*VACUUM\b/i.test(sql)) return null;
  const match = sql.match(
    new RegExp(`VACUUM\\s+(?:FULL\\s+)?(?:FREEZE\\s+)?(?:ANALYZE\\s+)?${IDENT_PATTERN}`, "i"),
  );
  return {
    type: "vacuum",
    raw: sql,
    line,
    table: match ? (match[1] ?? match[2]) : undefined,
  };
}

function matchValidateConstraint(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*ALTER\s+TABLE\b/i.test(sql)) return null;
  if (!/\bVALIDATE\s+CONSTRAINT\b/i.test(sql)) return null;
  const tableMatch = sql.match(ALTER_TABLE_PATTERN);
  const constraintMatch = sql.match(/VALIDATE\s+CONSTRAINT\s+(?:"([^"]+)"|(\S+))/i);
  return {
    type: "validateConstraint",
    raw: sql,
    line,
    table: tableMatch ? extractIdentifier(tableMatch) : undefined,
    constraintName: constraintMatch ? (constraintMatch[1] ?? constraintMatch[2]) : undefined,
  };
}

function matchUpdateStatement(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*UPDATE\b/i.test(sql)) return null;
  const hasWhere = /\bWHERE\b/i.test(sql);
  const tableMatch = sql.match(/UPDATE\s+(?:"([^"]+)"|(\S+))/i);
  return {
    type: "updateStatement",
    raw: sql,
    line,
    table: tableMatch ? (tableMatch[1] ?? tableMatch[2]) : undefined,
    hasWhere,
  };
}

function matchAlterTypeRename(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*ALTER\s+TYPE\b/i.test(sql)) return null;
  if (!/\bRENAME\s+TO\b/i.test(sql)) return null;
  const toMatch = sql.match(/RENAME\s+TO\s+(?:"([^"]+)"|(\S+))/i);
  const renameTo = toMatch ? (toMatch[1] ?? toMatch[2] ?? "") : "";
  if (!renameTo.endsWith("_old")) return null;
  const typeMatch = sql.match(/ALTER\s+TYPE\s+(?:"([^"]+)"|(\S+))/i);
  return {
    type: "alterType",
    raw: sql,
    line,
    typeName: typeMatch ? (typeMatch[1] ?? typeMatch[2]) : undefined,
  };
}

function matchCreateTable(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*CREATE\s+TABLE\b/i.test(sql)) return null;
  if (/\bAS\s+SELECT\b/i.test(sql)) return null;
  const tableMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|(\S+))/i);
  const hasSerialId = /["']?id["']?\s+SERIAL\b/i.test(sql);
  return {
    type: "createTable",
    raw: sql,
    line,
    table: tableMatch ? (tableMatch[1] ?? tableMatch[2]) : undefined,
    hasSerialId,
  };
}

function matchDropColumnDefault(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*ALTER\s+TABLE\b/i.test(sql)) return null;
  if (!/\bDROP\s+DEFAULT\b/i.test(sql)) return null;
  const tableMatch = sql.match(ALTER_TABLE_PATTERN);
  const columnMatch = sql.match(/ALTER\s+COLUMN\s+(?:"([^"]+)"|(\S+))/i);
  return {
    type: "alterTable",
    raw: sql,
    line,
    table: tableMatch ? extractIdentifier(tableMatch) : undefined,
    action: "dropColumnDefault",
    column: columnMatch ? (columnMatch[1] ?? columnMatch[2]) : undefined,
  };
}

function matchCreateTrigger(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\b/i.test(sql)) return null;
  const tableMatch = sql.match(/\bON\s+(?:"([^"]+)"|(\S+))/i);
  return {
    type: "createTrigger",
    raw: sql,
    line,
    table: tableMatch ? (tableMatch[1] ?? tableMatch[2]) : undefined,
  };
}

function matchDeleteStatement(sql: string, line: number): ParsedStatement | null {
  if (!/^\s*DELETE\s+FROM\b/i.test(sql)) return null;
  const hasWhere = /\bWHERE\b/i.test(sql);
  const tableMatch = sql.match(/DELETE\s+FROM\s+(?:"([^"]+)"|(\S+))/i);
  return {
    type: "deleteStatement",
    raw: sql,
    line,
    table: tableMatch ? (tableMatch[1] ?? tableMatch[2]) : undefined,
    hasWhere,
  };
}

function parseWithRegexFallback(sql: string, line: number): ParsedStatement | null {
  return (
    matchAlterSchemaRename(sql, line) ??
    matchAlterTypeRename(sql, line) ??
    matchAddConstraintNotValid(sql, line) ??
    matchAddExcludeConstraint(sql, line) ??
    matchTruncateTable(sql, line) ??
    matchSetTablespace(sql, line) ??
    matchClusterTable(sql, line) ??
    matchDisableTrigger(sql, line) ??
    matchDropColumnDefault(sql, line) ??
    matchCreateTableAsSelect(sql, line) ??
    matchCreateTable(sql, line) ??
    matchCreateTrigger(sql, line) ??
    matchVacuum(sql, line) ??
    matchValidateConstraint(sql, line) ??
    matchUpdateStatement(sql, line) ??
    matchDeleteStatement(sql, line)
  );
}

// ---- Statement splitter (used when full-file parse fails) ----

/**
 * Split SQL text into individual statements, respecting string literals and comments.
 * Returns each statement's text and its start offset in the original SQL.
 */
function splitIntoStatements(sql: string): Array<{ text: string; offset: number }> {
  const statements: Array<{ text: string; offset: number }> = [];
  let statementStart = 0;
  let position = 0;
  let insideString = false;
  let stringDelimiter = "";

  while (position < sql.length) {
    const character = sql[position];

    // Skip line comments (-- ...)
    if (!insideString && character === "-" && sql[position + 1] === "-") {
      while (position < sql.length && sql[position] !== "\n") position++;
      continue;
    }

    // Skip block comments (/* ... */)
    if (!insideString && character === "/" && sql[position + 1] === "*") {
      position += 2;
      while (position < sql.length && !(sql[position] === "*" && sql[position + 1] === "/")) {
        position++;
      }
      position += 2;
      continue;
    }

    // Track string literals
    if (!insideString && (character === "'" || character === '"')) {
      insideString = true;
      stringDelimiter = character;
      position++;
      continue;
    }
    if (insideString && character === stringDelimiter) {
      insideString = false;
      position++;
      continue;
    }

    // Statement boundary
    if (!insideString && character === ";") {
      statements.push({ text: sql.slice(statementStart, position + 1), offset: statementStart });
      statementStart = position + 1;
    }

    position++;
  }

  const trailingText = sql.slice(statementStart).trim();
  if (trailingText) statements.push({ text: trailingText, offset: statementStart });

  return statements;
}

// ---- Raw text and line number extraction from AST location ----

/**
 * Walk `slice` forward, skipping whitespace, block comments, and line comments.
 * Returns the offset (relative to `slice`) of the first SQL keyword character.
 */
function skipLeadingComments(slice: string): number {
  let i = 0;
  while (i < slice.length) {
    if (/\s/.test(slice[i])) {
      i++;
    } else if (slice.startsWith("/*", i)) {
      const end = slice.indexOf("*/", i + 2);
      i = end === -1 ? slice.length : end + 2;
    } else if (slice.startsWith("--", i)) {
      const end = slice.indexOf("\n", i + 2);
      i = end === -1 ? slice.length : end + 1;
    } else {
      return i;
    }
  }
  return i;
}

function getRawTextAndLine(
  sql: string,
  location: { start: number; end: number },
): { raw: string; line: number } {
  // _location.start points to the first character of this statement (NOT the
  // preceding semicolon). Use it directly as the content start.
  const contentStart = location.start;
  const raw = sql.slice(contentStart, location.end + 1).trim();
  // line: use skipLeadingComments so that disable-next-line comments placed
  // immediately before the SQL keyword are matched correctly. For the fast
  // path, _location.start already points at the keyword so this is usually a
  // no-op, but guards against any leading whitespace pgsql-ast-parser may skip.
  const firstTokenOffset = contentStart + skipLeadingComments(sql.slice(contentStart));
  const line = lineNumberAt(firstTokenOffset, sql);
  return { raw, line };
}

// ---- Public API ----

function buildDisableTransactionStatements(sql: string): ParsedStatement[] {
  const results: ParsedStatement[] = [];
  const lines = sql.split("\n");
  lines.forEach((lineText, lineIndex) => {
    if (DISABLE_TRANSACTION_PATTERN.test(lineText)) {
      results.push({
        type: "disableTransaction",
        raw: lineText.trim(),
        line: lineIndex + 1,
      });
    }
  });
  return results;
}

export function parseSql(sql: string): ParsedStatement[] {
  const disableMap = buildDisableMap(sql);

  function applyDisableComment(parsedStatement: ParsedStatement): ParsedStatement {
    const entry = disableMap.get(parsedStatement.line);
    if (entry !== undefined) {
      parsedStatement.disabled = entry.rules;
      if (entry.reason) parsedStatement.disableReason = entry.reason;
    }
    return parsedStatement;
  }

  const disableTransactionStatements =
    buildDisableTransactionStatements(sql).map(applyDisableComment);

  // Fast path: parse the whole file at once
  try {
    const { ast } = parseWithComments(sql, { locationTracking: true });
    const sqlStatements = ast.flatMap((statement) => {
      if (!statement._location) return [];
      const { raw, line } = getRawTextAndLine(sql, statement._location);
      const parsed = convertStatement(statement, raw, line) ?? parseWithRegexFallback(raw, line);
      return parsed ? [applyDisableComment(parsed)] : [];
    });
    return [...disableTransactionStatements, ...sqlStatements];
  } catch {
    // pgsql-ast-parser failed on the whole file (e.g. EXCLUDE constraints, NOT VALID)
    // Fall back to parsing each statement individually
  }

  // Slow path: split into individual statements and parse each one
  return [
    ...disableTransactionStatements,
    ...splitIntoStatements(sql).flatMap(({ text, offset }) => {
      const trimmed = text.trim().replace(/;$/, "");
      if (!trimmed) return [];

      const firstTokenOffset = offset + skipLeadingComments(text);
      const line = lineNumberAt(firstTokenOffset, sql);

      // Strip block comments before AST/regex parsing — pgsql-ast-parser chokes on
      // characters like backticks that Prisma puts inside /* Warnings: ... */ blocks.
      const stripped = trimmed.replace(/\/\*[\s\S]*?\*\//g, "").trim();
      if (!stripped) return [];

      // Try AST parse for this single statement
      try {
        const { ast } = parseWithComments(stripped + ";", { locationTracking: true });
        if (ast[0]) {
          const parsed =
            convertStatement(ast[0], trimmed, line) ?? parseWithRegexFallback(stripped, line);
          return parsed ? [applyDisableComment(parsed)] : [];
        }
      } catch {
        // AST parse failed → try regex patterns
      }

      const parsed = parseWithRegexFallback(stripped, line);
      return parsed ? [applyDisableComment(parsed)] : [];
    }),
  ];
}
