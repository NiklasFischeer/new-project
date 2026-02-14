import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const destructiveRegex = /\b(DROP\s+TABLE|DROP\s+COLUMN|DROP\s+TYPE|TRUNCATE\s+TABLE|DELETE\s+FROM)\b/i;

async function main() {
  if (process.env.ALLOW_DESTRUCTIVE_MIGRATIONS === "true") {
    console.log("Migration safety check skipped (ALLOW_DESTRUCTIVE_MIGRATIONS=true).");
    return;
  }

  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const migrationFiles = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsDir, entry.name, "migration.sql"));

  const findings = [];

  for (const filePath of migrationFiles) {
    try {
      const content = await readFile(filePath, "utf8");
      const lines = content.split(/\r?\n/);

      lines.forEach((line, index) => {
        if (destructiveRegex.test(line)) {
          findings.push(`${filePath}:${index + 1}: ${line.trim()}`);
        }
      });
    } catch {
      // Ignore missing migration.sql in non-standard dirs.
    }
  }

  if (findings.length) {
    console.error("Destructive migration statements detected. Review required:");
    findings.forEach((finding) => console.error(`- ${finding}`));
    console.error('If intentional, rerun with ALLOW_DESTRUCTIVE_MIGRATIONS=true.');
    process.exit(1);
  }

  console.log("Migration safety check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
