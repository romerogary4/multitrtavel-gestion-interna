import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cliente, documento, servicioEspecial } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import type { AppSession } from "@/types";
import { eq, and } from "drizzle-orm";
import { pagoCliente, devolucion } from "@/db/schema";

// GET /api/clientes/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  // agente y agente_doc solo pueden ver sus propios clientes
  const esAgente = ["agente", "agente_doc"].includes(session.user.rol);

  const result = await db.query.cliente.findFirst({
    where: esAgente
      ? and(eq(cliente.id, id), eq(cliente.agenteId, session.user.id))
      : eq(cliente.id, id),
    with: {
      paquete: true,
      agente: { columns: { id: true, name: true, email: true, image: true } },
      documentos: { orderBy: (d: any, { desc }: any) => [desc(d.subidoEn)] },
      pagos: { orderBy: (p: any, { desc }: any) => [desc(p.creadoEn)], with: { registradoPor: { columns: { name: true } } } },
      devoluciones: { orderBy: (d: any, { desc }: any) => [desc(d.creadoEn)] },
      serviciosEspeciales: {
        with: { agente: { columns: { id: true, name: true } } },
        orderBy: (s: any, { desc }: any) => [desc(s.creadoEn)],
      },
    },
  });

  if (!result) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  return NextResponse.json(result);
}

// PATCH /api/clientes/[id] - Actualizar cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const updateData: any = {
    actualizadoEn: new Date(),
  };

  // Campos permitidos para actualizar — estado NO está aquí, se cambia solo via /api/clientes/estado
  const allowedFields = [
    "nombre", "apellidos", "email", "telefono", "direccion",
    "nacionalidad", "tipoDocumento", "numeroDocumento",
    "paqueteId", "destino", "fechaSalida", "fechaRegreso",
    "formaPago", "moneda", "notas",
  ];

  // Solo admin puede cambiar estado directamente en este endpoint (legacy)
  if (body.estado !== undefined) {
    if (session.user.rol !== "administrador") {
      return NextResponse.json({ error: "Solo el administrador puede cambiar el estado" }, { status: 403 });
    }
    updateData.estado = body.estado;
    updateData.adminId = session.user.id;

    // Si el admin está aprobando (desde cualquier estado pendiente),
    // marcar todos los pagos no confirmados como confirmados
    const estadosAprobacion = ["pagado", "activo", "pendiente_pago"];
    if (estadosAprobacion.includes(body.estado)) {
      const cliActual = await db.query.cliente.findFirst({ where: eq(cliente.id, id) });
      if (cliActual && cliActual.estado === "pendiente_confirmacion" || cliActual?.estado === "pendiente_admin") {
        await db.update(pagoCliente).set({
          confirmado: true,
          confirmadoEn: new Date(),
          confirmadoPor: session.user.id,
        }).where(eq(pagoCliente.clienteId, id));
      }
    }
  }

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  });

  const [updated] = await db
    .update(cliente)
    .set(updateData)
    .where(eq(cliente.id, id))
    .returning();

  return NextResponse.json(updated);
}