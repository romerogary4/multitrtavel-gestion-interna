import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { servicioEspecial } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import type { AppSession } from "@/types";
import { saveFile, ALLOWED_DOC_TYPES, validateFile } from "@/lib/upload";
import { eq } from "drizzle-orm";

// POST /api/servicios/comprobante?id=xxx — Subir comprobante a un servicio especial
export async function POST(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const servicio = await db.query.servicioEspecial.findFirst({
    where: eq(servicioEspecial.id, id),
  });
  if (!servicio) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  // Solo el agente que lo creó o un admin puede subir comprobantes
  const esAdmin = session.user.rol === "administrador";
  if (!esAdmin && servicio.agenteId !== session.user.id) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const formData = await request.formData();
  const archivo = formData.get("comprobante") as File | null;
  if (!archivo || archivo.size === 0) {
    return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
  }

  const v = validateFile(archivo.type, archivo.size, ALLOWED_DOC_TYPES);
  if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 });

  const buf = Buffer.from(await archivo.arrayBuffer());
  const saved = await saveFile(buf, archivo.name, "comprobantes");

  const comprobantesActuales = (servicio.comprobantes as string[]) || [];
  const nuevosComprobantes = [...comprobantesActuales, saved.rutaArchivo];

  await db.update(servicioEspecial)
    .set({ comprobantes: nuevosComprobantes, actualizadoEn: new Date() })
    .where(eq(servicioEspecial.id, id));

  return NextResponse.json({ ok: true, ruta: saved.rutaArchivo });
}
