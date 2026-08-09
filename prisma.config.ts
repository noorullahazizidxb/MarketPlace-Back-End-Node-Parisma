import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL ?? "mysql://prisma:prisma@localhost:3306/prisma";
process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: databaseUrl,
    },
});