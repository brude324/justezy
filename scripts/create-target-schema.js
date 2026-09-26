const fs = require("fs");
const path = require("path");

const srcPath = path.resolve(__dirname, "../docs/database/prisma-schema-target.prisma");
const destPath = path.resolve(__dirname, "../prisma/schema.target.prisma");

const content = fs.readFileSync(srcPath, "utf-8");
const updated = content.replace(
  /generator\s+client\s+\{[\s\S]*?\}/,
  `generator client {\n  provider = "prisma-client-js"\n  output   = "../src/generated/target-client"\n}`
);

fs.writeFileSync(destPath, updated, "utf-8");
console.log("Successfully created prisma/schema.target.prisma");
