import type { Rule } from "../types";

export const addExclusionConstraintRule: Rule = {
  name: "add_exclusion_constraint",
  code: "SM010",
  severity: "error",
  description: "Adding an exclusion constraint locks the table",

  detect: (stmt) =>
    stmt.type === "alterTable" &&
    stmt.action === "addConstraint" &&
    stmt.constraintType === "exclusion",

  message: (stmt) => `Adding exclusion constraint "${stmt.constraintName}" locks the table`,

  suggestion: (_stmt) =>
    `
❌ Bad: Adding an exclusion constraint always requires a full table scan and locks the table

✅ Good: Consider these alternatives:
   1. Add the constraint during off-peak hours with reduced traffic
   2. Consider whether application-level validation can replace the constraint
   3. If the constraint is required, plan for a maintenance window

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line add_exclusion_constraint
`.trim(),
};
