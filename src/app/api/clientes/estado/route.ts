import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cliente } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import { crearNotificacion } from "@/lib/notificaciones";
import type { AppSession } from "@/types";
import { eq } from "drizzle-orm";
import { saveFile, ALLOWED_DOC_TYPES, validateFile } from "@/lib/upload";

export async function PATCH(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const clienteId = formData.get("clienteId") as string;
    const nota = formData.get("nota") as string | null;
    let nuevoEstado = formData.get("estado") as string;

    if (!clienteId || !nuevoEstado) {
      return NextResponse.json({ error: "clienteId y estado son requeridos" }, { status: 400 });
    }

    const cli = await db.query.cliente.findFirst({ where: eq(cliente.id, clienteId) });
    if (!cli) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    if (nuevoEstado === "confirmar_cuota") {
      const totalPagado = Number(cli.montoPagado || 0);
      const totalReq = Number(cli.montoTotal || 0);
      const completo = totalReq > 0 && totalPagado >= totalReq;
      nuevoEstado = completo ? "pagado" : "pendiente_pago";
    }

    let comprobanteRuta: string | undefined;
    const archivo = formData.get("comprobante") as File | null;
    if (archivo && archivo.size > 0) {
      const v = validateFile(archivo.type, archivo.size, ALLOWED_DOC_TYPES);
      if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 });
      const buf = Buffer.from(await archivo.arrayBuffer());
      const saved = await saveFile(buf, archivo.name, "comprobantes");
      comprobanteRuta = saved.rutaArchivo;
    }

    const historial = (cli.historialEstados as any[]) || [];
    historial.push({
      estadoAnterior: cli.estado,
      estadoNuevo: nuevoEstado,
      nota: nota || undefined,
      comprobante: comprobanteRuta,
      fecha: new Date().toISOString(),
      adminId: session.user.id,
      adminNombre: (session.user as any).name,
    });

    const [updated] = await db.update(cliente).set({
      estado: nuevoEstado as any,
      historialEstados: historial as any,
      actualizadoEn: new Date(),
    }).where(eq(cliente.id, clienteId)).returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error actualizando estado:", error);
    return NextResponse.json({ error: "Error al actualizar el estado" }, { status: 500 });
  }
}