import { db } from "@/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Cambiando tipo_servicio de enum a text...");

  await db.execute(sql`
    ALTER TABLE servicio_especial
    ALTER COLUMN tipo_servicio TYPE text
  `);

  console.log("✓ Columna tipo_servicio ahora es text libre");
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
