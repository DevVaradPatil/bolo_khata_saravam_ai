import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Lets Vercel Fluid compute close idle connections before a function instance is suspended.
  attachDatabasePool(pool);
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

// Lazy, so `next build` doesn't need DATABASE_URL.
let db: ReturnType<typeof createDb> | undefined;
export const getDb = () => (db ??= createDb());
