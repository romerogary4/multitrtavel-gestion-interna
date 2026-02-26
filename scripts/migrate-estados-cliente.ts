import { db } from "@/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Migrando estados de cliente...");

  // Añadir nuevos valores al enum
  await db.execute(sql`ALTER TYPE estado_cliente ADD VALUE IF NOT EXISTS 'pendiente_confirmacion'`);
  await db.execute(sql`ALTER TYPE estado_cliente ADD VALUE IF NOT EXISTS 'pagado'`);

  // Añadir columna historial de cambios de estado
  await db.execute(sql`
    ALTER TABLE cliente
      ADD COLUMN IF NOT EXISTS historial_estados jsonb NOT NULL DEFAULT '[]'::jsonb
  `);

  console.log("✓ Migración completada");
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
