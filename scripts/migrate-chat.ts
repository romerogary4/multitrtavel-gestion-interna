import { db } from "@/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Creando tablas de chat...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS conversacion (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tipo text NOT NULL DEFAULT 'privada',
      participantes jsonb NOT NULL DEFAULT '[]'::jsonb,
      creado_en timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mensaje (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      conversacion_id uuid NOT NULL REFERENCES conversacion(id) ON DELETE CASCADE,
      autor_id text NOT NULL REFERENCES "user"(id),
      contenido text NOT NULL,
      leido_por jsonb NOT NULL DEFAULT '[]'::jsonb,
      creado_en timestamp NOT NULL DEFAULT now()
    )
  `);

  // Crear índice para queries rápidas
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_mensaje_conv ON mensaje(conversacion_id, creado_en DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_mensaje_autor ON mensaje(autor_id)`);

  // Crear conversación general si no existe
  const general = await db.execute(sql`SELECT id FROM conversacion WHERE tipo='general' LIMIT 1`);
  if (general.rows.length === 0) {
    await db.execute(sql`INSERT INTO conversacion(tipo, participantes) VALUES('general', '[]'::jsonb)`);
    console.log("✓ Sala general creada");
  }

  console.log("✓ Tablas de chat creadas");
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
