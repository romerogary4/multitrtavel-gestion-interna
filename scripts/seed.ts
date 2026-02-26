/**
 * Script para crear el primer usuario administrador
 * Ejecutar: npx tsx scripts/seed.ts
 */

import { db } from "../src/db";
import { user } from "../src/db/schema";
import { auth } from "../src/lib/auth";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Creando usuario administrador inicial...");

  const email = "admin@multitravel.es";
  const password = "Admin1234!"; // Cambiar después del primer login

  try {
    // Crear usuario via Better Auth
    const result = await auth.api.signUpEmail({
      body: {
        name: "Administrador",
        email,
        password,
      },
    });

    // Promover a administrador
    await db
      .update(user)
      .set({ rol: "administrador" })
      .where(eq(user.id, result.user.id));

    console.log("✅ Usuario administrador creado:");
    console.log(`   Email: ${email}`);
    console.log(`   Contraseña: ${password}`);
    console.log("   ⚠️  Cambia la contraseña después del primer login!");
  } catch (error: any) {
    if (error.message?.includes("email")) {
      console.log("ℹ️  El usuario administrador ya existe.");
    } else {
      console.error("❌ Error:", error.message);
    }
  }

  process.exit(0);
}

seed();
