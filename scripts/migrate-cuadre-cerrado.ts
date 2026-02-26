import { db } from "@/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Añadiendo campos cerrado a cuadre_diario...");
  await db.execute(sql`
    ALTER TABLE cuadre_diario
      ADD COLUMN IF NOT EXISTS cerrado boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS cerrado_en timestamp;
  `);
  console.log("✓ Migración completada");
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
