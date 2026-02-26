import { db } from "@/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Creando tabla catalogo_servicio...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS catalogo_servicio (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre text NOT NULL,
      icono text NOT NULL DEFAULT '⭐',
      descripcion text,
      precio_base decimal(10,2),
      activo boolean NOT NULL DEFAULT true,
      orden integer NOT NULL DEFAULT 0,
      creado_en timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    INSERT INTO catalogo_servicio (nombre, icono, descripcion, orden) VALUES
      ('Azafata',                  '👩‍✈️', 'Servicio de azafata para el viaje', 1),
      ('Documentación / Notaría',  '📋', 'Gestión de documentos y trámites notariales', 2),
      ('Seguro de Viaje',          '🛡️', 'Seguro médico y de viaje', 3),
      ('Maleta Extra',             '🧳', 'Equipaje adicional', 4),
      ('Otro',                     '⭐', 'Servicio especial personalizado', 5)
    ON CONFLICT DO NOTHING
  `);

  console.log("✓ Tabla catalogo_servicio creada con datos iniciales");
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
