import type { ParsedStatement } from "../parser/types";
import type { CheckContext, Rule } from "./types";

const IMPLICIT_M2M_PATTERN = /^_[A-Z][a-zA-Z]*To[A-Z][a-zA-Z]*$/;

const detect = (statement: ParsedStatement, _context: CheckContext): boolean => {
  return (
    statement.type === "createTable" &&
    !!statement.table &&
    IMPLICIT_M2M_PATTERN.test(statement.table)
  );
};

const message = (statement: ParsedStatement): string => {
  const table = statement.table ? `"${statement.table}"` : "this table";
  return `${table} is a Prisma implicit M2M join table — consider using an explicit M2M relation instead`;
};

const suggestion = (statement: ParsedStatement): string => {
  const table = statement.table ?? "_CategoryToPost";
  const [modelA, modelB] = table
    .replace(/^_/, "")
    .split("To")
    .map((s) => s.charAt(0).toLowerCase() + s.slice(1));
  const ModelA = (modelA ?? "modelA").charAt(0).toUpperCase() + (modelA ?? "modelA").slice(1);
  const ModelB = (modelB ?? "modelB").charAt(0).toUpperCase() + (modelB ?? "modelB").slice(1);

  return `
⚠️  Warning: Prisma generated "${table}" as an implicit M2M join table (columns "A" and "B" only).
   Implicit M2M tables are fully managed by Prisma — you cannot add extra fields or
   control indexes, and the naming is opaque.

✅ Good: Convert to an explicit M2M relation in schema.prisma:

   model ${ModelA}On${ModelB} {
     ${modelA ?? "modelA"}   ${ModelA} @relation(fields: [${modelA ?? "modelA"}Id], references: [id])
     ${modelA ?? "modelA"}Id Int
     ${modelB ?? "modelB"}   ${ModelB} @relation(fields: [${modelB ?? "modelB"}Id], references: [id])
     ${modelB ?? "modelB"}Id Int
     assignedAt DateTime @default(now())

     @@id([${modelA ?? "modelA"}Id, ${modelB ?? "modelB"}Id])
   }

   Then run: npx prisma migrate dev

To skip this check, add above the statement:
   -- prisma-strong-migrations-disable-next-line implicitM2mRelation
`.trim();
};

// fix: 未実装（schema.prisma を explicit M2M に書き換えて再生成が正解のため）

export const implicitM2mRelationRule: Rule = {
  name: "implicitM2mRelation",
  severity: "warning",
  description: "Prisma implicit M2M join table detected — explicit M2M relation is recommended",
  detect,
  message,
  suggestion,
};
