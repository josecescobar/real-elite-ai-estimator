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
    url: `${tursoUrl}?authToken=${authToken}`,
  },
});
