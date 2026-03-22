import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPendingMigrationNames, migrationNameFromPath } from "./prisma-runner";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true),
}));

import { spawnSync } from "node:child_process";
const mockSpawnSync = vi.mocked(spawnSync);

describe("getPendingMigrationNames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty Set when exit status is 0 (DB up to date)", () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: "Database schema is up to date!",
      stderr: "",
      pid: 1,
      output: [],
      signal: null,
    });

    const result = getPendingMigrationNames();
    expect(result).toEqual(new Set());
  });

  it("should return empty Set when stdout says up to date even with non-zero exit", () => {
    mockSpawnSync.mockReturnValue({
      status: 1,
      stdout: "Database schema is up to date",
      stderr: "",
      pid: 1,
      output: [],
      signal: null,
    });

    const result = getPendingMigrationNames();
    expect(result).toEqual(new Set());
  });

  it("should return Set of pending migration names", () => {
    mockSpawnSync.mockReturnValue({
      status: 1,
      stdout: [
        "Following migrations have not yet been applied:",
        "20260101000000_add_users",
        "20260102000000_add_posts",
        "",
        "To apply them, run prisma migrate deploy",
      ].join("\n"),
      stderr: "",
      pid: 1,
      output: [],
      signal: null,
    });

    const result = getPendingMigrationNames();
    expect(result).toEqual(
      new Set(["20260101000000_add_users", "20260102000000_add_posts"]),
    );
  });

  it("should return null when exit is 1 but no pending names are found (error state)", () => {
    mockSpawnSync.mockReturnValue({
      status: 1,
      stdout: "Error: Could not connect to database",
      stderr: "",
      pid: 1,
      output: [],
      signal: null,
    });

    const result = getPendingMigrationNames();
    expect(result).toBeNull();
  });

  it("should return null when spawnSync returns null status", () => {
    mockSpawnSync.mockReturnValue({
      status: null,
      stdout: "",
      stderr: "",
      pid: 1,
      output: [],
      signal: null,
    });

    const result = getPendingMigrationNames();
    expect(result).toBeNull();
  });

  it("should pass --schema to prisma when schemaPath is provided", () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: "",
      stderr: "",
      pid: 1,
      output: [],
      signal: null,
    });

    getPendingMigrationNames("./prisma/schema.prisma");

    expect(mockSpawnSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["--schema", "./prisma/schema.prisma"]),
      expect.any(Object),
    );
  });
});

describe("migrationNameFromPath", () => {
  it("should extract migration name from relative path", () => {
    expect(
      migrationNameFromPath("prisma/migrations/20260322000000_add_users/migration.sql"),
    ).toBe("20260322000000_add_users");
  });

  it("should extract migration name from absolute path", () => {
    expect(
      migrationNameFromPath("/workspace/project/prisma/migrations/20260101000000_init/migration.sql"),
    ).toBe("20260101000000_init");
  });

  it("should handle migration name with multiple underscores", () => {
    expect(
      migrationNameFromPath("prisma/migrations/20260322000000_add_user_posts_table/migration.sql"),
    ).toBe("20260322000000_add_user_posts_table");
  });
});
