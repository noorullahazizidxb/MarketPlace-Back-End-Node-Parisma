import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Build-time safe: Docker `prisma generate` often has no DATABASE_URL.
// Runtime still uses the real DATABASE_URL from the container env.
function normalizeProvider(raw?: string) {
  const value = (raw || "mysql").trim().toLowerCase();
  if (value === "postgres") return "postgresql";
  if (value === "postgresql" || value === "sqlite" || value === "mysql") return value;
  return "mysql";
}

function migrationFolder(provider: string) {
  if (provider === "postgresql") return "migrations-postgresql";
  if (provider === "sqlite") return "migrations-sqlite";
  return "migrations";
}

function fallbackUrl(provider: string) {
  if (provider === "sqlite") return "file:./dev.db";
  if (provider === "postgresql") return "postgresql://prisma:prisma@localhost:5432/prisma";
  return "mysql://prisma:prisma@localhost:3306/prisma";
}

const provider = normalizeProvider(process.env.DATABASE_PROVIDER);
const databaseUrl = process.env.DATABASE_URL ?? fallbackUrl(provider);

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", migrationFolder(provider)),
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
