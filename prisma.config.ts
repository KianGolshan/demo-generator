import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration.
 * - DIRECT_URL: Direct Postgres connection used for migrations (bypasses pooler)
 * - DATABASE_URL: Runtime connection string (PgBouncer pooler in production)
 *
 * The PrismaPg adapter for runtime queries is configured in src/lib/prisma.ts.
 * This config is only used by the Prisma CLI (migrations, introspection, etc.).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
