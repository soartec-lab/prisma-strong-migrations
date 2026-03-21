export type StatementType =
  | "alterTable"
  | "createIndex"
  | "dropIndex"
  | "createTable"
  | "dropTable"
  | "alterSchema"
  | "alterType"
  | "createTrigger"
  | "disableTransaction"
  | "truncateTable"
  | "setTablespace"
  | "clusterTable"
  | "disableTrigger"
  | "createTableAsSelect"
  | "vacuum"
  | "validateConstraint"
  | "updateStatement"
  | "deleteStatement"
  | "unknown";

export type AlterAction =
  | "addColumn"
  | "dropColumn"
  | "renameColumn"
  | "alterColumnType"
  | "alterColumnSetNotNull"
  | "alterColumnSetDefault"
  | "dropColumnDefault"
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
  notNull?: boolean;
  hasDefault?: boolean;
  disabled?: string[];
  disableReason?: string;
  hasWhere?: boolean;
  typeName?: string;
  hasSerialId?: boolean;
}
