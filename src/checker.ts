import { parseSql } from "./parser/sql-parser";
import { builtinRules } from "./rules";
import type { Config } from "./config/types";
import type { CheckResult } from "./rules/types";

export interface CheckOptions {
  sql: string;
  config: Config;
  migrationPath: string;
}

export async function check(options: CheckOptions): Promise<CheckResult[]> {
  const { sql, config, migrationPath } = options;
  const statements = parseSql(sql);
  const disabledRules = config.disabledRules ?? [];
  const customRules = config.customRules ?? [];
  const allRules = [...builtinRules, ...customRules];

  const context = {
    statements,
    migrationPath,
    config,
  };

  const results: CheckResult[] = [];

  for (const statement of statements) {
    for (const rule of allRules) {
      // Skip globally disabled rules
      if (disabledRules.includes(rule.name)) {
        continue;
      }

      // Check disable comments on the statement
      if (statement.disabled !== undefined) {
        const disabled = statement.disabled;
        // Empty array means disable all rules
        if (disabled.length === 0) continue;
        // Check if this specific rule is disabled
        if (disabled.includes(rule.name)) continue;
      }

      if (rule.detect(statement, context)) {
        results.push({
          rule,
          statement,
          message: rule.message(statement),
          suggestion: rule.suggestion(statement),
        });
      }
    }
  }

  return results;
}
