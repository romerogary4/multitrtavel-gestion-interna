import { db } from "@/db";
import { sql } from "drizzle-orm";

async function reset() {
  console.log("🧹 Limpiando datos de prueba...");

  await db.execute(sql`DELETE FROM mensaje`);
  await db.execute(sql`DELETE FROM conversacion`);
  await db.execute(sql`DELETE FROM servicio_especial`);
  await db.execute(sql`DELETE FROM pago_cliente`);
  await db.execute(sql`DELETE FROM devolucion`);
  await db.execute(sql`DELETE FROM cliente`);
  await db.execute(sql`DELETE FROM cuadre_diario`);

  await db.execute(sql`
    DELETE FROM "user" WHERE rol != 'administrador'
  `);

  await db.execute(sql`
    DELETE FROM session WHERE user_id NOT IN (SELECT id FROM "user")
  `);

  console.log("✅ Listo. Datos borrados:");
  console.log("   - Todos los clientes y pagos");
  console.log("   - Todos los cuadres diarios");
  console.log("   - Todos los servicios especiales");
  console.log("   - Todos los mensajes del chat");
  console.log("   - Todos los usuarios excepto administradores");
  console.log("");
  console.log("👤 Usuarios que quedan:");
  const users = await db.execute(sql`SELECT name, email, rol FROM "user"`);
  users.rows.forEach((u: any) => console.log(`   - ${u.name} (${u.email}) — ${u.rol}`));

  process.exit(0);
}

reset().catch(e => { console.error(e); process.exit(1); });
