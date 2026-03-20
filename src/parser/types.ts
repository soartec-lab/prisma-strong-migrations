export type StatementType =
  | 'alter_table'
  | 'create_index'
  | 'drop_index'
  | 'create_table'
  | 'drop_table'
  | 'alter_schema'
  | 'unknown';

export type AlterAction =
  | 'add_column'
  | 'drop_column'
  | 'rename_column'
  | 'alter_column_type'
  | 'alter_column_set_not_null'
  | 'alter_column_set_default'
  | 'add_constraint'
  | 'rename_table';

export type ConstraintType =
  | 'foreign_key'
  | 'check'
  | 'unique'
  | 'exclusion';

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
  _disabled?: string[];
}
