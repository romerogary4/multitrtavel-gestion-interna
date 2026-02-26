/**
 * Script de limpieza para puesta en producción
 * Borra TODOS los datos de prueba y deja solo el admin
 * 
 * Ejecutar UNA SOLA VEZ antes de ir a producción:
 *   npx tsx scripts/reset-produccion.ts
 */

import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function resetProduccion() {
  console.log("🧹 Iniciando limpieza para producción...\n");

  // Borrar en orden por dependencias de FK
  await db.execute(sql`DELETE FROM notificacion`);
  console.log("✓ Notificaciones eliminadas");

  await db.execute(sql`DELETE FROM tarea`);
  console.log("✓ Tareas eliminadas");

  await db.execute(sql`DELETE FROM servicio_especial`);
  console.log("✓ Servicios especiales eliminados");

  await db.execute(sql`DELETE FROM pago_cliente`);
  console.log("✓ Pagos eliminados");

  await db.execute(sql`DELETE FROM devolucion`);
  console.log("✓ Devoluciones eliminadas");

  await db.execute(sql`DELETE FROM documento`);
  console.log("✓ Documentos eliminados");

  await db.execute(sql`DELETE FROM cliente`);
  console.log("✓ Clientes eliminados");

  await db.execute(sql`DELETE FROM cuadre_diario`);
  console.log("✓ Cuadres diarios eliminados");

  await db.execute(sql`DELETE FROM session WHERE user_id IN (
    SELECT id FROM "user" WHERE rol != 'administrador'
  )`);
  await db.execute(sql`DELETE FROM account WHERE user_id IN (
    SELECT id FROM "user" WHERE rol != 'administrador'
  )`);
  await db.execute(sql`DELETE FROM "user" WHERE rol != 'administrador'`);
  console.log("✓ Usuarios de prueba eliminados (agentes)");

  await db.execute(sql`DELETE FROM session WHERE user_id NOT IN (SELECT id FROM "user")`);
  console.log("✓ Sesiones huérfanas eliminadas");

  console.log("\n✅ Limpieza completada.\n");
  console.log("👤 Usuarios administradores que quedan:");
  const admins = await db.execute(sql`SELECT name, email FROM "user" WHERE rol = 'administrador'`);
  admins.rows.forEach((u: any) => console.log(`   → ${u.name} <${u.email}>`));
  console.log("\n⚠️  Recuerda: los archivos subidos en /uploads/ debes borrarlos manualmente si los hay.");

  process.exit(0);
}

resetProduccion().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
