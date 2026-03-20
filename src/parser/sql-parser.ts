import { parseWithComments } from "pgsql-ast-parser";
import type {
  Statement,
  AlterTableStatement,
  CreateIndexStatement,
  DropStatement,
  DataTypeDef,
} from "pgsql-ast-parser";
import type { ParsedStatement, ConstraintType } from "./types";

const DISABLE_RE = /--\s*prisma-strong-migrations-disable-next-line\s*([\w\s,]*)/;
const NOT_VALID_RE = /\bNOT\s+VALID\b/i;
const ALTER_SCHEMA_RENAME_RE = /^\s*ALTER\s+SCHEMA\s+(?:"[^"]+"|[^\s]+)\s+RENAME\s+TO\b/i;
const ADD_EXCLUDE_CONSTRAINT_RE = /\bADD\s+CONSTRAINT\s+(?:"[^"]+"|[^\s(]+)\s+EXCLUDE\b/i;

// ---------- line/offset helpers ----------

function buildLineStarts(sql: string): number[] {
  const starts = [0];
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function offsetToLine(offset: number, lineStarts: number[]): number {
  let lo = 0,
    hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** Find the first non-whitespace offset at or after `from`. */
function skipWhitespace(sql: string, from: number): number {
  let i = from;
  while (i < sql.length && /\s/.test(sql[i])) i++;
  return i;
}

// ---------- disable-comment parsing ----------

/**
 * Scan the raw SQL text for disable-next-line comments.
 * Returns a map of (1-based line number of the NEXT statement) → rule names.
 * Empty array means "disable all rules".
 */
function buildDisableMap(sql: string): Map<number, string[]> {
  const map = new Map<number, string[]>();
  const lines = sql.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(DISABLE_RE);
    if (!match) continue;
    const rulesStr = match[1].trim();
    const rules = rulesStr ? rulesStr.split(/[\s,]+/).filter(Boolean) : [];
    map.set(i + 2, rules); // i+1 = this line (1-based), i+2 = next line
  }
  return map;
}

// ---------- type helpers ----------

function dataTypeName(dt: DataTypeDef): string {
  if (dt.kind === "array") return dataTypeName(dt.arrayOf) + "[]";
  return (dt as { name: string }).name.toLowerCase();
}

function constraintTypeFor(type: string): ConstraintType | null {
  if (type === "foreign key") return "foreignKey";
  if (type === "check") return "check";
  if (type === "unique") return "unique";
  return null;
}

// ---------- AST → ParsedStatement converters ----------

function convertAlterTable(
  stmt: AlterTableStatement,
  raw: string,
  line: number,
): ParsedStatement | null {
  const table = stmt.table.name;
  const change = stmt.changes[0];
  if (!change) return null;

  switch (change.type) {
    case "add column": {
      const col = change.column;
      return {
        type: "alterTable",
        raw,
        line,
        table,
        action: "addColumn",
        column: col.name.name,
        dataType: dataTypeName(col.dataType),
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

    case "alter column": {
      const alter = change.alter;
      if (alter.type === "set type") {
        return {
          type: "alterTable",
          raw,
          line,
          table,
          action: "alterColumnType",
          column: change.column.name,
          dataType: dataTypeName(alter.dataType),
        };
      }
      if (alter.type === "set not null") {
        return {
          type: "alterTable",
          raw,
          line,
          table,
          action: "alterColumnSetNotNull",
          column: change.column.name,
        };
      }
      if (alter.type === "set default") {
        return {
          type: "alterTable",
          raw,
          line,
          table,
          action: "alterColumnSetDefault",
          column: change.column.name,
        };
      }
      return null;
    }

    case "add constraint": {
      const constraint = change.constraint;
      const constraintType = constraintTypeFor(constraint.type);
      if (!constraintType) return null;
      const notValid = NOT_VALID_RE.test(raw);
      return {
        type: "alterTable",
        raw,
        line,
        table,
        action: "addConstraint",
        constraintType,
        constraintName: constraint.constraintName?.name,
        ...(notValid ? { notValid: true } : {}),
      };
    }

    case "rename":
      return {
        type: "alterTable",
        raw,
        line,
        table,
        action: "renameTable",
      };

    default:
      return null;
  }
}

function convertCreateIndex(
  stmt: CreateIndexStatement,
  raw: string,
  line: number,
): ParsedStatement {
  return {
    type: "createIndex",
    raw,
    line,
    table: stmt.table.name,
    indexName: stmt.indexName?.name,
    columns: stmt.expressions
      .map((e) => (e.expression.type === "ref" ? (e.expression.name as string) : ""))
      .filter(Boolean),
    concurrently: !!stmt.concurrently,
    unique: !!stmt.unique,
  };
}

function convertDropIndex(stmt: DropStatement, raw: string, line: number): ParsedStatement {
  return {
    type: "dropIndex",
    raw,
    line,
    indexName: stmt.names[0]?.name,
    concurrently: !!stmt.concurrently,
  };
}

function convertStatement(stmt: Statement, raw: string, line: number): ParsedStatement | null {
  switch (stmt.type) {
    case "alter table":
      return convertAlterTable(stmt as AlterTableStatement, raw, line);
    case "create index":
      return convertCreateIndex(stmt as CreateIndexStatement, raw, line);
    case "drop index":
      return convertDropIndex(stmt as DropStatement, raw, line);
    default:
      return null;
  }
}

// ---------- regex-based fallback for unsupported constructs ----------

function matchRegexStatement(text: string, line: number): ParsedStatement | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (ALTER_SCHEMA_RENAME_RE.test(trimmed)) {
    return { type: "alterSchema", raw: trimmed, line };
  }

  if (ADD_EXCLUDE_CONSTRAINT_RE.test(trimmed)) {
    const tableMatch = trimmed.match(/ALTER\s+TABLE\s+(?:"([^"]+)"|([^\s(]+))/i);
    const constraintMatch = trimmed.match(/ADD\s+CONSTRAINT\s+(?:"([^"]+)"|([^\s(]+))/i);
    return {
      type: "alterTable",
      raw: trimmed,
      line,
      table: tableMatch?.[1] ?? tableMatch?.[2],
      action: "addConstraint",
      constraintType: "exclusion",
      constraintName: constraintMatch?.[1] ?? constraintMatch?.[2],
    };
  }

  return null;
}

// ---------- statement splitter (for fallback) ----------

/**
 * Split SQL into individual statement texts with their start offsets.
 * Handles single-quoted strings and line/block comments.
 */
function splitStatements(sql: string): Array<{ text: string; offset: number }> {
  const results: Array<{ text: string; offset: number }> = [];
  let start = 0;
  let inString = false;
  let stringChar = "";
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    if (!inString && ch === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    if (!inString && ch === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (!inString && (ch === "'" || ch === '"')) {
      inString = true;
      stringChar = ch;
      i++;
      continue;
    }
    if (inString && ch === stringChar) {
      inString = false;
      i++;
      continue;
    }
    if (!inString && ch === ";") {
      results.push({ text: sql.slice(start, i + 1), offset: start });
      start = i + 1;
    }
    i++;
  }

  const remaining = sql.slice(start).trim();
  if (remaining) results.push({ text: remaining, offset: start });

  return results;
}

// ---------- public API ----------

export function parseSql(sql: string): ParsedStatement[] {
  const lineStarts = buildLineStarts(sql);
  const disableMap = buildDisableMap(sql);

  function applyDisable(parsed: ParsedStatement): void {
    const disabled = disableMap.get(parsed.line);
    if (disabled !== undefined) parsed.disabled = disabled;
  }

  // Happy path: parse the entire SQL with pgsql-ast-parser
  try {
    const { ast } = parseWithComments(sql, { locationTracking: true });
    const results: ParsedStatement[] = [];
    for (const stmt of ast) {
      const loc = stmt._location;
      if (!loc) continue;
      const rawFrom = loc.start > 0 ? loc.start + 1 : 0;
      const raw = sql.slice(rawFrom, loc.end + 1).trim();
      const line = offsetToLine(skipWhitespace(sql, rawFrom), lineStarts);
      const parsed = convertStatement(stmt, raw, line);
      if (!parsed) continue;
      applyDisable(parsed);
      results.push(parsed);
    }
    return results;
  } catch {
    // Whole-file parse failed → fall back to per-statement parsing
  }

  // Fallback: parse each statement individually
  const results: ParsedStatement[] = [];
  for (const { text, offset } of splitStatements(sql)) {
    const contentStart = skipWhitespace(sql, offset);
    const line = offsetToLine(contentStart, lineStarts);
    const trimmed = text.trim();
    if (!trimmed || trimmed === ";") continue;

    let parsed: ParsedStatement | null = null;

    const singleSql = trimmed.endsWith(";") ? trimmed : trimmed + ";";
    try {
      const { ast: singleAst } = parseWithComments(singleSql, {
        locationTracking: true,
      });
      if (singleAst[0]) {
        parsed = convertStatement(singleAst[0], trimmed, line);
      }
    } catch {
      parsed = matchRegexStatement(trimmed, line);
    }

    if (!parsed) continue;
    applyDisable(parsed);
    results.push(parsed);
  }

  return results;
}
