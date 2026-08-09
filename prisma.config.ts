/**
 * Prisma configuration for Migrate.
 *
 * Connection URLs were removed from `schema.prisma`.
 * Put migration connection URLs here so the Prisma CLI can pick them up.
 * See: https://pris.ly/d/config-datasource
 */
const config = {
    datasources: {
        db: {
            // Provide the database connection used by the Prisma CLI (migrate/generate)
            url: process.env.DATABASE_URL,
        },
    },
};

export default config;
