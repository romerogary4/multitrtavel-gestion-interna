import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { servicioEspecial, cliente } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import { crearNotificacion } from "@/lib/notificaciones";
import type { AppSession } from "@/types";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const clienteId = searchParams.get("clienteId");
    const conditions = [];
    if (session.user.rol === "agente") conditions.push(eq(servicioEspecial.agenteId, session.user.id));
    if (estado) conditions.push(eq(servicioEspecial.estado, estado as any));
    if (clienteId) conditions.push(eq(servicioEspecial.clienteId, clienteId));
    const servicios = await db.query.servicioEspecial.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        cliente: { columns: { id: true, nombre: true, apellidos: true } },
        agente: { columns: { id: true, name: true } },
        admin: { columns: { id: true, name: true } },
      },
      orderBy: [desc(servicioEspecial.creadoEn)],
    });
    return NextResponse.json(servicios);
  } catch (error) {
    console.error("Error cargando servicios:", error);
    return NextResponse.json({ error: "Error al cargar servicios" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const body = await request.json();
    const { clienteId, tipoServicio, descripcionServicio, monto, moneda, justificacion } = body;
    if (!clienteId || !tipoServicio || !justificacion) {
      return NextResponse.json({ error: "clienteId, tipoServicio y justificacion son obligatorios" }, { status: 400 });
    }
    const clienteData = await db.query.cliente.findFirst({ where: eq(cliente.id, clienteId) });
    if (!clienteData) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    if (session.user.rol === "agente" && clienteData.agenteId !== session.user.id) {
      return NextResponse.json({ error: "Sin acceso a este cliente" }, { status: 403 });
    }
    const esAdmin = session.user.rol === "administrador";
    const [servicio] = await db.insert(servicioEspecial).values({
      clienteId,
      tipoServicio: body.tipoServicio || tipoServicio,
      descripcionServicio: descripcionServicio || undefined,
      monto: monto || undefined,
      moneda: moneda || "EUR",
      justificacion,
      agenteId: session.user.id,
      adminId: esAdmin ? session.user.id : undefined,
      estado: esAdmin ? "aprobada" : "pendiente",
      revisadoEn: esAdmin ? new Date() : undefined,
    }).returning();

    // Notificar a admins cuando un agente solicita un servicio especial
    if (!esAdmin) {
      await crearNotificacion({
        tipo: "servicio_solicitado",
        titulo: "Nueva solicitud de servicio especial",
        mensaje: `${session.user.name} solicitó un servicio especial para ${clienteData.nombre} ${clienteData.apellidos}: ${tipoServicio}`,
        paraAdmin: true,
        clienteId: clienteId,
        servicioId: servicio.id,
      });
    }
    return NextResponse.json(servicio, { status: 201 });
  } catch (error) {
    console.error("Error creando servicio:", error);
    return NextResponse.json({ error: "Error al crear servicio" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden gestionar solicitudes" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const servicioId = searchParams.get("id");
    if (!servicioId) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const body = await request.json();
    const { estado, motivoRechazo } = body;
    if (!["aprobada", "rechazada"].includes(estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    const [updated] = await db.update(servicioEspecial).set({
      estado, motivoRechazo: motivoRechazo || null,
      adminId: session.user.id, revisadoEn: new Date(), actualizadoEn: new Date(),
    }).where(eq(servicioEspecial.id, servicioId)).returning();
    // Notificar al agente que solicitó el servicio
    if (updated.agenteId) {
      await crearNotificacion({
        tipo: estado === "aprobada" ? "servicio_aprobado" : "servicio_rechazado",
        titulo: estado === "aprobada" ? "Servicio especial aprobado" : "Servicio especial rechazado",
        mensaje: estado === "aprobada"
          ? `Tu solicitud de servicio especial fue aprobada`
          : `Tu solicitud fue rechazada${motivoRechazo ? ": " + motivoRechazo : ""}`,
        paraAgenteId: updated.agenteId,
        servicioId: updated.id,
        clienteId: updated.clienteId,
      });
    }
    revalidatePath("/dashboard");
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error actualizando servicio:", error);
    return NextResponse.json({ error: "Error al actualizar servicio" }, { status: 500 });
  }
}