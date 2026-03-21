import { Command } from "commander";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export function registerInitRuleCommand(program: Command): void {
  program
    .command("init-rule <name>")
    .description("Generate a custom rule template")
    .action(async (name: string) => {
      const template = `// prisma-strong-migrations-rules/${name}.js
/** @type {import('prisma-strong-migrations').Rule} */
export default {
  name: '${name}',
  severity: 'error',
  description: 'Description of ${name} rule',

  detect: (statement, _context) => {
    // Return true if the statement should be flagged
    return false;
  },

  message: (statement) => {
    return \`Detected issue in \${statement.table ?? 'unknown table'}\`;
  },

  suggestion: (statement) => {
    return \`Review the operation on \${statement.table ?? 'unknown table'} carefully\`;
  },
};
`;
      const dir = "./prisma-strong-migrations-rules";
      await mkdir(dir, { recursive: true });
      const filePath = join(dir, `${name}.js`);
      await writeFile(filePath, template, "utf-8");
      console.log(`Created ${filePath}`);
    });
}
