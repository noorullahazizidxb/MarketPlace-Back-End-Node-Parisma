// Prisma CLI-friendly CommonJS config.
// Exports the datasource URL for migrations and generation.
// Using CommonJS ensures Node can require it regardless of TS tooling.
module.exports = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};
