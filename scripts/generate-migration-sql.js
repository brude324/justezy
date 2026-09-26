const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const migrationDir = path.resolve(__dirname, "../prisma/migrations/20260925_expand_target_schema");
if (!fs.existsSync(migrationDir)) {
  fs.mkdirSync(migrationDir, { recursive: true });
}

console.log("Generating forward migration SQL...");
const forwardSql = execSync(
  `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.target.prisma --script`,
  { encoding: "utf-8" }
);
fs.writeFileSync(path.join(migrationDir, "migration.sql"), forwardSql, "utf-8");
console.log("Wrote prisma/migrations/20260925_expand_target_schema/migration.sql");

console.log("Generating rollback migration SQL...");
const rollbackSql = execSync(
  `npx prisma migrate diff --from-schema-datamodel prisma/schema.target.prisma --to-empty --script`,
  { encoding: "utf-8" }
);
fs.writeFileSync(path.join(migrationDir, "rollback.sql"), rollbackSql, "utf-8");
console.log("Wrote prisma/migrations/20260925_expand_target_schema/rollback.sql");
