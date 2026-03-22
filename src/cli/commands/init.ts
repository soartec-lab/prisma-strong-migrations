import { Command } from "commander";
import { createInterface } from "node:readline";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const CONFIG_TEMPLATE = `// prisma-strong-migrations.config.js
/** @type {import('prisma-strong-migrations').Config} */
export default {
  // Disable specific rules by name
  disabledRules: [],

  // Ignore specific migration files (substring patterns)
  ignoreMigrations: [],

  // Directory containing custom rule files
  customRulesDir: './prisma-strong-migrations-rules',

  // Migrations directory
  migrationsDir: './prisma/migrations',

  // Treat warnings as errors
  warningsAsErrors: false,

  // Exit with non-zero code if warnings are found (default: false)
  failOnWarning: false,

  // Exit with non-zero code if errors are found (default: true)
  failOnError: true,
};
`;

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function updatePackageJsonScripts(): Promise<void> {
  if (!existsSync("package.json")) {
    console.log("  package.json not found, skipping.");
    return;
  }

  const raw = await readFile("package.json", "utf-8");
  const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
  const scripts = pkg.scripts ?? {};

  const devTargets = Object.entries(scripts).filter(([, v]) => v.includes("prisma migrate dev"));
  const deployTargets = Object.entries(scripts).filter(([, v]) =>
    v.includes("prisma migrate deploy"),
  );

  if (devTargets.length === 0 && deployTargets.length === 0) {
    console.log("  No prisma migrate scripts found in package.json.");
    return;
  }

  let modified = false;

  for (const [key, value] of devTargets) {
    const newValue = value.replace(/prisma migrate dev/g, "prisma-strong-migrations migrate dev");
    console.log(`\n  "${key}": "${value}"`);
    console.log(`  → "${key}": "${newValue}"`);
    const answer = await prompt("  Replace? (Y/n) ");
    if (answer === "" || answer === "y") {
      scripts[key] = newValue;
      modified = true;
    }
  }

  for (const [key, value] of deployTargets) {
    const newValue = value.replace(
      /prisma migrate deploy/g,
      "prisma-strong-migrations migrate deploy",
    );
    console.log(`\n  "${key}": "${value}"`);
    console.log(`  → "${key}": "${newValue}"`);
    const answer = await prompt("  Replace? (Y/n) ");
    if (answer === "" || answer === "y") {
      scripts[key] = newValue;
      modified = true;
    }
  }

  if (modified) {
    pkg.scripts = scripts;
    await writeFile("package.json", JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    console.log("\n  ✅ package.json updated.");
  }
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize prisma-strong-migrations config and setup wizard")
    .action(async () => {
      console.log("✅ Initializing prisma-strong-migrations\n");

      // 1. Create config file
      await writeFile("prisma-strong-migrations.config.js", CONFIG_TEMPLATE, "utf-8");
      console.log("Created prisma-strong-migrations.config.js");

      // 2. Update package.json scripts
      console.log("\nChecking package.json scripts...");
      await updatePackageJsonScripts();

      console.log("\n✅ Done!");
    });
}
