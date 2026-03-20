import { Check, Violation } from "../types";

/**
 * Detects `CREATE INDEX` (or `CREATE UNIQUE INDEX`) without `CONCURRENTLY`.
 *
 * Building an index without CONCURRENTLY acquires an `ACCESS EXCLUSIVE` lock
 * on the table in PostgreSQL, which blocks all reads and writes for the
 * duration of the index build.
 *
 * Safe strategy: Use `CREATE INDEX CONCURRENTLY` so that the index is built
 * without holding a long-lived lock. Note that this cannot run inside a
 * transaction block.
 */
export const addIndexWithoutConcurrently: Check = {
  name: "add_index_without_concurrently",

  detect(sql: string): boolean {
    // Match CREATE [UNIQUE] INDEX but NOT CREATE ... INDEX CONCURRENTLY
    return (
      /\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(sql) &&
      !/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/i.test(sql)
    );
  },

  buildViolation(statement: string, line: number): Violation {
    return {
      check: this.name,
      message:
        "Adding an index without CONCURRENTLY locks the table for the " +
        "duration of the index build in PostgreSQL. Use " +
        "`CREATE INDEX CONCURRENTLY` instead. Note: this cannot run inside " +
        "a transaction block, so you may need to split the migration.",
      statement,
      line,
    };
  },
};
