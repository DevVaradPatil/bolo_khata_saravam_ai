import { defineConfig } from "drizzle-kit";

process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  casing: "snake_case",
  // Migrations use the direct (unpooled) connection.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
});
