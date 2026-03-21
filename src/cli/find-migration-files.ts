import { readdir } from "node:fs/promises";
import { join } from "node:path";

export async function findMigrationFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await findMigrationFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.name === "migration.sql") {
      files.push(fullPath);
    }
  }

  return files.sort();
}
