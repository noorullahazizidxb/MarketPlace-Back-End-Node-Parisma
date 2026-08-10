import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Build-time safe: Docker `prisma generate` often has no DATABASE_URL.
// Runtime still uses the real DATABASE_URL from the container env.
const databaseUrl =
  process.env.DATABASE_URL ?? "mysql://prisma:prisma@localhost:3306/prisma";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
