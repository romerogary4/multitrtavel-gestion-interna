import { db } from "@/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Creando nuevas tablas...");

  // Nuevo enum tipo_pago
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE tipo_pago AS ENUM ('completo', 'plazo');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  // Nuevo estado pendiente_pago y devuelto en estado_cliente
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE estado_cliente ADD VALUE IF NOT EXISTS 'pendiente_pago';
      ALTER TYPE estado_cliente ADD VALUE IF NOT EXISTS 'devuelto';
    EXCEPTION WHEN others THEN null;
    END $$;
  `);

  // Nuevas columnas en cliente
  await db.execute(sql`
    ALTER TABLE cliente
      ADD COLUMN IF NOT EXISTS tipo_pago tipo_pago DEFAULT 'completo',
      ADD COLUMN IF NOT EXISTS monto_total decimal(10,2);
  `);

  // Tabla pagos de cliente
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pago_cliente (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      cliente_id uuid NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
      monto decimal(10,2) NOT NULL,
      moneda text DEFAULT 'EUR',
      forma_pago forma_pago NOT NULL,
      comprobante text,
      notas text,
      registrado_por text REFERENCES "user"(id),
      creado_en timestamp NOT NULL DEFAULT now()
    );
  `);

  // Tabla devoluciones
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS devolucion (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      cliente_id uuid NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
      monto decimal(10,2) NOT NULL,
      moneda text DEFAULT 'EUR',
      motivo text NOT NULL,
      comprobante text,
      procesado_por text REFERENCES "user"(id),
      creado_en timestamp NOT NULL DEFAULT now()
    );
  `);

  console.log("✓ Migración completada");
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
