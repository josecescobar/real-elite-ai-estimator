import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma migrate needs https:// URL, not libsql://
const tursoUrl = process.env["TURSO_DATABASE_URL"]?.replace("libsql://", "https://");
const authToken = process.env["TURSO_AUTH_TOKEN"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.mts",
  },
  datasource: {
    // For local migrations, use the same file: database the app and seed read
    // from TURSO_DATABASE_URL (so migrate and runtime point at one file);
    // fall back to prisma/dev.db when it isn't a file: URL.
    url: process.env["PRISMA_MIGRATE_LOCAL"]
      ? process.env["TURSO_DATABASE_URL"]?.startsWith("file:")
        ? process.env["TURSO_DATABASE_URL"]
        : "file:./prisma/dev.db"
      : `${tursoUrl}?authToken=${authToken}`,
  },
});
