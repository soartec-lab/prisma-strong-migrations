import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return (
    statement.type === "alterTable" &&
    statement.action === "addConstraint" &&
    statement.constraintType === "exclusion"
  );
};

const message = (statement: ParsedStatement): string => {
  return `Adding exclusion constraint "${statement.constraintName}" locks the table`;
};

const suggestion = (_statement: ParsedStatement): string => {
  return `
❌ Bad: Adding an exclusion constraint always requires a full table scan and locks the table

✅ Good: Consider these alternatives:
   1. Add the constraint during off-peak hours with reduced traffic
   2. Consider whether application-level validation can replace the constraint
   3. If the constraint is required, plan for a maintenance window

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line addExclusionConstraint
`.trim();
};

export const addExclusionConstraintRule: Rule = {
  name: "addExclusionConstraint",
  severity: "error",
  description: "Adding an exclusion constraint locks the table",
  detect,
  message,
  suggestion,
};
