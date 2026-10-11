import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Switch SQL engines with DB_PROVIDER:
 *   DB_PROVIDER=sqlite       → prisma/schema.sqlite.prisma + SQLITE_URL
 *   DB_PROVIDER=postgresql   → prisma/postgres/schema.prisma + DATABASE_URL
 *   DB_PROVIDER=mysql        → prisma/schema.prisma + DATABASE_URL  (default, Docker / VPS)
 */
const provider = String(process.env.DB_PROVIDER || "mysql").toLowerCase();
const useSQLite = provider === "sqlite";
const usePostgres = provider === "postgresql" || provider === "postgres";

export default defineConfig({
  schema: useSQLite
    ? path.join("prisma", "schema.sqlite.prisma")
    : usePostgres
      ? path.join("prisma", "postgres", "schema.prisma")
      : path.join("prisma", "schema.prisma"),

  migrations: {
    path: useSQLite
      ? path.join("prisma", "migrations-sqlite")
      : usePostgres
        ? path.join("prisma", "postgres", "migrations")
        : path.join("prisma", "migrations"),
    seed: "node scripts/seedAll.js",
  },

  engine: "classic",

  datasource: {
    url: useSQLite
      ? (process.env.SQLITE_URL ?? "file:./dev.db")
      : (process.env.DATABASE_URL ?? "mysql://prisma:prisma@localhost:3306/prisma"),
    ...(usePostgres
      ? {
          directUrl:
            process.env.DIRECT_URL ??
            process.env.DATABASE_URL ??
            "postgresql://prisma:prisma@localhost:5432/prisma",
        }
      : {}),
  },
});
