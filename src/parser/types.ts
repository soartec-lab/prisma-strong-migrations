export type StatementType =
  | "alterTable"
  | "createIndex"
  | "dropIndex"
  | "createTable"
  | "dropTable"
  | "alterSchema"
  | "unknown";

export type AlterAction =
  | "addColumn"
  | "dropColumn"
  | "renameColumn"
  | "alterColumnType"
  | "alterColumnSetNotNull"
  | "alterColumnSetDefault"
  | "addConstraint"
  | "renameTable";

export type ConstraintType = "foreignKey" | "check" | "unique" | "exclusion";

export interface ParsedStatement {
  type: StatementType;
  raw: string;
  line: number;
  table?: string;
  action?: AlterAction;
  column?: string;
  dataType?: string;
  indexName?: string;
  columns?: string[];
  concurrently?: boolean;
  unique?: boolean;
  constraintName?: string;
  constraintType?: ConstraintType;
  notValid?: boolean;
  disabled?: string[];
}
