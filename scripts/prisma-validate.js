/**
 * Helper script to execute Prisma validation deterministically across environments.
 * If DATABASE_URL is not set in the shell or .env, supplies a non-sensitive placeholder URI
 * so that schema structural validation can succeed without requiring live DB access.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function loadEnvFileIfPresent(filename) {
  const filePath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // Ignore read errors
  }
}

// Attempt to load from .env.local then .env
loadEnvFileIfPresent(".env.local");
loadEnvFileIfPresent(".env");

// Fallback dummy for structural validation
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://dev:dev@localhost:5432/schoolyard_dev?schema=public";
}

const args = process.argv.slice(2).join(" ");
const command = `npx prisma validate ${args}`;

try {
  execSync(command, { stdio: "inherit", env: process.env });
} catch (error) {
  process.exit(error.status || 1);
}
