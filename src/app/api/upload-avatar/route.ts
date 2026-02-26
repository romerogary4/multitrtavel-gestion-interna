import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import { eq } from "drizzle-orm";
import { saveFile, ALLOWED_IMAGE_TYPES, validateFile } from "@/lib/upload";
import type { AppSession } from "@/types";

export async function POST(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (session.user.rol !== "administrador" && session.user.id !== userId) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  const validation = validateFile(file.type, file.size, ALLOWED_IMAGE_TYPES);
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { rutaArchivo } = await saveFile(buffer, file.name, "avatares");
    // Guardar ruta absoluta accesible desde el front
    const url = `/api/files/${rutaArchivo}`;
    const targetId = userId || session.user.id;

    // Actualizar en BD
    await db.update(user).set({ image: url, updatedAt: new Date() }).where(eq(user.id, targetId));

    // Verificar que se guardó
    const updated = await db.query.user.findFirst({ where: eq(user.id, targetId) });
    console.log("Avatar guardado:", updated?.image);

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error("Error upload avatar:", error);
    return NextResponse.json({ error: "Error subiendo avatar" }, { status: 500 });
  }
}
