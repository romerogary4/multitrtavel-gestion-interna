import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pagoCliente, cliente } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import { eq, sum } from "drizzle-orm";
import { crearNotificacion } from "@/lib/notificaciones";
import { saveFile, ALLOWED_DOC_TYPES, validateFile } from "@/lib/upload";
import type { AppSession } from "@/types";

export async function GET(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const clienteId = new URL(request.url).searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });
  try {
    const pagos = await db.query.pagoCliente.findMany({
      where: eq(pagoCliente.clienteId, clienteId),
      with: { registradoPor: { columns: { name: true } } },
      orderBy: (p, { desc }) => [desc(p.creadoEn)],
    });
    return NextResponse.json(pagos);
  } catch (error) {
    console.error("Error cargando pagos:", error);
    return NextResponse.json({ error: "Error al cargar pagos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const formData = await request.formData();
    const clienteId = formData.get("clienteId") as string;
    const monto = formData.get("monto") as string;
    const formaPago = formData.get("formaPago") as string;
    const notas = formData.get("notas") as string;

    if (!clienteId || !monto || !formaPago) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const montoNum = Math.round(Number(monto) * 100) / 100;
    if (isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }
    const montoStr = montoNum.toFixed(2);

    // Verificar que el cliente existe
    const cli = await db.query.cliente.findFirst({ where: eq(cliente.id, clienteId) });
    if (!cli) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    // Subir comprobante si existe
    let comprobanteRuta: string | undefined;
    const archivo = formData.get("comprobante") as File | null;
    if (archivo && archivo.size > 0) {
      const v = validateFile(archivo.type, archivo.size, ALLOWED_DOC_TYPES);
      if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 });
      const buf = Buffer.from(await archivo.arrayBuffer());
      const saved = await saveFile(buf, archivo.name, "comprobantes");
      comprobanteRuta = saved.rutaArchivo;
    }

    // 1. Insertar pago
    await db.insert(pagoCliente).values({
      clienteId, monto: montoStr, formaPago: formaPago as any,
      comprobante: comprobanteRuta, notas: notas || undefined,
      registradoPor: session.user.id,
    });

    // 2. Recalcular total pagado
    const [totalResult] = await db.select({ total: sum(pagoCliente.monto) })
      .from(pagoCliente).where(eq(pagoCliente.clienteId, clienteId));
    const nuevoTotal = Math.round(Number(totalResult.total || 0) * 100) / 100;

    const montoTotal = Number(cli.montoTotal || 0);
    const estaCompleto = montoTotal > 0 && nuevoTotal >= montoTotal;
    const nuevoEstado = "pendiente_confirmacion";

    // 3. Actualizar historial y cliente
    const historial = (cli.historialEstados as any[]) || [];
    historial.push({
      estadoAnterior: cli.estado,
      estadoNuevo: nuevoEstado,
      nota: `Cuota registrada: ${monto} ${cli.moneda} (${formaPago})${estaCompleto ? " — Pago completo" : ""}`,
      fecha: new Date().toISOString(),
      adminId: session.user.id,
      adminNombre: (session.user as any).name,
    });

    await db.update(cliente).set({
      montoPagado: String(nuevoTotal),
      estado: nuevoEstado as any,
      historialEstados: historial as any,
      actualizadoEn: new Date(),
    }).where(eq(cliente.id, clienteId));

    // Notificar al admin: abono registrado
    await crearNotificacion({
      tipo: "pago_registrado",
      titulo: "Abono registrado",
      mensaje: `${(session.user as any).name || session.user.email} registró un abono de ${monto} ${cli.moneda} para ${cli.nombre} ${cli.apellidos}${estaCompleto ? " — Pago completo ✓" : ""}`,
      paraAdmin: true,
      clienteId: clienteId,
    });

    return NextResponse.json({ ok: true, nuevoEstado, totalPagado: nuevoTotal, estaCompleto });
  } catch (error) {
    console.error("Error registrando pago:", error);
    return NextResponse.json({ error: "Error al registrar el pago" }, { status: 500 });
  }
}