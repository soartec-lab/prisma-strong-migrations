import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Rule } from "./types";

export async function loadCustomRules(dir: string): Promise<Rule[]> {
  const absDir = resolve(dir);

  let files: string[];
  try {
    const entries = await readdir(absDir);
    files = entries.filter((f) => f.endsWith(".js") || f.endsWith(".ts"));
  } catch {
    return [];
  }

  const rules: Rule[] = [];
  for (const file of files) {
    const filePath = join(absDir, file);
    try {
      const module = await import(filePath);
      const rule: Rule = module.default ?? module;
      validateRule(rule, filePath);
      rules.push(rule);
    } catch (error) {
      throw new Error(`Failed to load custom rule from ${filePath}: ${error}`);
    }
  }

  return rules;
}

function validateRule(rule: unknown, filePath: string): asserts rule is Rule {
  if (typeof rule !== "object" || rule === null) {
    throw new Error(`Rule in ${filePath} must export an object`);
  }

  const r = rule as Record<string, unknown>;
  const required = ["name", "severity", "description", "detect", "message", "suggestion"];

  for (const field of required) {
    if (!(field in r)) {
      throw new Error(`Rule in ${filePath} is missing required field: ${field}`);
    }
  }

  if (r.severity !== "error" && r.severity !== "warning") {
    throw new Error(`Rule in ${filePath} has invalid severity: ${r.severity}`);
  }

  for (const fn of ["detect", "message", "suggestion"]) {
    if (typeof r[fn] !== "function") {
      throw new Error(`Rule in ${filePath} field '${fn}' must be a function`);
    }
  }
}
