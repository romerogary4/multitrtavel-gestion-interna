import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { servicioEspecial } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import { saveFile, ALLOWED_DOC_TYPES, validateFile } from "@/lib/upload";
import { eq } from "drizzle-orm";

// POST /api/servicios/[id]/comprobantes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const servicio = await db.query.servicioEspecial.findFirst({
    where: eq(servicioEspecial.id, id),
  });

  if (!servicio) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  if (servicio.estado !== "aprobada") {
    return NextResponse.json(
      { error: "Solo se pueden subir comprobantes de servicios aprobados" },
      { status: 400 }
    );
  }

  // Solo el agente que solicitó o el admin pueden subir comprobantes
  if (
    session.user.rol === "agente" &&
    servicio.agenteId !== session.user.id
  ) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const archivos = formData.getAll("archivos") as File[];

    if (!archivos.length) {
      return NextResponse.json({ error: "No se recibieron archivos" }, { status: 400 });
    }

    const nuevasRutas: string[] = [];

    for (const archivo of archivos) {
      const validation = validateFile(archivo.type, archivo.size, ALLOWED_DOC_TYPES);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const buffer = Buffer.from(await archivo.arrayBuffer());
      const saved = await saveFile(buffer, archivo.name, `servicios/${id}`);
      nuevasRutas.push(saved.rutaArchivo);
    }

    const comprobantesActuales = (servicio.comprobantes as string[]) || [];
    const todosComprobantes = [...comprobantesActuales, ...nuevasRutas];

    const [updated] = await db
      .update(servicioEspecial)
      .set({
        comprobantes: todosComprobantes,
        actualizadoEn: new Date(),
      })
      .where(eq(servicioEspecial.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error subiendo comprobantes:", error);
    return NextResponse.json({ error: "Error al subir archivos" }, { status: 500 });
  }
}
