import type { Rule } from "./types";
import { removeColumnRule } from "./remove-column";
import { renameColumnRule } from "./rename-column";
import { renameTableRule } from "./rename-table";
import { changeColumnTypeRule } from "./change-column-type";
import { addIndexRule } from "./add-index";
import { removeIndexRule } from "./remove-index";
import { addForeignKeyRule } from "./add-foreign-key";
import { addCheckConstraintRule } from "./add-check-constraint";
import { addUniqueConstraintRule } from "./add-unique-constraint";
import { addExclusionConstraintRule } from "./add-exclusion-constraint";
import { setNotNullRule } from "./set-not-null";
import { addJsonColumnRule } from "./add-json-column";
import { addVolatileDefaultRule } from "./add-volatile-default";
import { addAutoIncrementRule } from "./add-auto-increment";
import { addStoredGeneratedRule } from "./add-stored-generated";
import { renameSchemaRule } from "./rename-schema";
import { indexColumnsCountRule } from "./index-columns-count";
import { dropTableRule } from "./drop-table";
import { disableTransactionWarningRule } from "./disable-transaction-warning";
import { addNotNullWithoutDefaultRule } from "./add-not-null-without-default";
import { truncateTableRule } from "./truncate-table";

export const builtinRules: Rule[] = [
  removeColumnRule,
  renameColumnRule,
  renameTableRule,
  changeColumnTypeRule,
  addIndexRule,
  removeIndexRule,
  addForeignKeyRule,
  addCheckConstraintRule,
  addUniqueConstraintRule,
  addExclusionConstraintRule,
  setNotNullRule,
  addJsonColumnRule,
  addVolatileDefaultRule,
  addAutoIncrementRule,
  addStoredGeneratedRule,
  renameSchemaRule,
  dropTableRule,
  disableTransactionWarningRule,
  addNotNullWithoutDefaultRule,
  truncateTableRule,
  indexColumnsCountRule,
];

export { loadCustomRules } from "./loader";
export type { Rule, CheckContext, CheckResult, Severity } from "./types";
