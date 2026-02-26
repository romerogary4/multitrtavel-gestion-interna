import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";
import * as relations from "./relations";

// Validar variables de entorno críticas al arrancar
if (!process.env.DATABASE_URL) {
    throw new Error("❌ DATABASE_URL no está configurado");
}
if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("❌ BETTER_AUTH_SECRET no está configurado");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema: { ...schema, ...relations } });

export type DB = typeof db;