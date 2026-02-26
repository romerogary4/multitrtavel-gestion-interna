import { db } from "@/db";
import { cuadreDiario } from "@/db/schema";
import { sql } from "drizzle-orm";

async function fix() {
  console.log("Eliminando cuadres duplicados...");

  // Dejar solo el más reciente por fecha, borrar el resto
  await db.execute(sql`
    DELETE FROM cuadre_diario
    WHERE id NOT IN (
      SELECT DISTINCT ON (date_trunc('day', fecha)) id
      FROM cuadre_diario
      ORDER BY date_trunc('day', fecha), creado_en DESC
    )
  `);

  const restantes = await db.select().from(cuadreDiario);
  console.log(`✓ Cuadres restantes: ${restantes.length}`);
  process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
