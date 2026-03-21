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
import { setTablespaceRule } from "./set-tablespace";
import { clusterTableRule } from "./cluster-table";
import { disableTriggerRule } from "./disable-trigger";
import { createTableAsSelectRule } from "./create-table-as-select";
import { vacuumInMigrationRule } from "./vacuum-in-migration";
import { concurrentWithoutDisableTransactionRule } from "./concurrent-without-disable-transaction";
import { notValidValidateSameFileRule } from "./not-valid-validate-same-file";
import { mixedStatementsWithDisabledTransactionRule } from "./mixed-statements-with-disabled-transaction";
import { updateWithoutWhereRule } from "./update-without-where";
import { deleteWithoutWhereRule } from "./delete-without-where";
import { backfillInMigrationRule } from "./backfill-in-migration";
import { enumValueRemovalRule } from "./enum-value-removal";
import { implicitM2mTableChangeRule } from "./implicit-m2m-table-change";
import { implicitM2mRelationRule } from "./implicit-m2m-relation";
import { intPrimaryKeyRule } from "./int-primary-key";
import { cuidUuidDefaultRemovalRule } from "./cuid-uuid-default-removal";
import { prismaManagedColumnChangeRule } from "./prisma-managed-column-change";

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
  setTablespaceRule,
  clusterTableRule,
  disableTriggerRule,
  createTableAsSelectRule,
  vacuumInMigrationRule,
  concurrentWithoutDisableTransactionRule,
  notValidValidateSameFileRule,
  mixedStatementsWithDisabledTransactionRule,
  updateWithoutWhereRule,
  deleteWithoutWhereRule,
  backfillInMigrationRule,
  enumValueRemovalRule,
  implicitM2mTableChangeRule,
  implicitM2mRelationRule,
  intPrimaryKeyRule,
  cuidUuidDefaultRemovalRule,
  prismaManagedColumnChangeRule,
  indexColumnsCountRule,
];

export { loadCustomRules } from "./loader";
export type { Rule, CheckContext, CheckResult, Severity } from "./types";
