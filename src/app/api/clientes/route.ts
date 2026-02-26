import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cliente, paquete, pagoCliente } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import type { AppSession } from "@/types";
import { saveFile, ALLOWED_IMAGE_TYPES, ALLOWED_DOC_TYPES, validateFile } from "@/lib/upload";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { crearNotificacion } from "@/lib/notificaciones";

export async function GET(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const busqueda = (searchParams.get("busqueda") || searchParams.get("q") || "").slice(0, 100) || null;
  const estado = searchParams.get("estado");
  const formaPago = searchParams.get("formaPago");
  const paqueteId = searchParams.get("paquete");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const pagina = parseInt(searchParams.get("pagina") || "1");
  const limite = Math.min(parseInt(searchParams.get("limite") || "20"), 100); // máx 100 por página
  const esAgente = session.user.rol === "agente";

  const conditions = [];
  if (esAgente) conditions.push(eq(cliente.agenteId, session.user.id));
  if (estado) conditions.push(eq(cliente.estado, estado as any));
  if (formaPago) conditions.push(eq(cliente.formaPago, formaPago as any));
  if (paqueteId) conditions.push(eq(cliente.paqueteId, paqueteId));
  if (desde) conditions.push(gte(cliente.creadoEn, new Date(desde)));
  if (hasta) conditions.push(lte(cliente.creadoEn, new Date(hasta)));
  if (busqueda) {
    conditions.push(sql`(${cliente.nombre} ILIKE ${"%" + busqueda + "%"} OR ${cliente.apellidos} ILIKE ${"%" + busqueda + "%"} OR ${cliente.email} ILIKE ${"%" + busqueda + "%"} OR ${cliente.telefono} ILIKE ${"%" + busqueda + "%"})`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [clientes, total] = await Promise.all([
    db.query.cliente.findMany({
      where, with: { paquete: true, agente: { columns: { id: true, name: true, email: true, image: true } } },
      orderBy: [desc(cliente.creadoEn)], limit: limite, offset: (pagina - 1) * limite,
    }),
    db.select({ count: sql<number>`count(*)` }).from(cliente).where(where).then(r => r[0].count),
  ]);

  return NextResponse.json({ clientes, total, pagina, totalPaginas: Math.ceil(total / limite) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const formData = await request.formData();

    const nombre = formData.get("nombre") as string;
    const apellidos = formData.get("apellidos") as string;
    const email = formData.get("email") as string;
    const telefono = formData.get("telefono") as string;
    const direccion = formData.get("direccion") as string;
    const nacionalidad = formData.get("nacionalidad") as string;
    const tipoDocumento = formData.get("tipoDocumento") as string;
    const numeroDocumento = formData.get("numeroDocumento") as string;
    const paqueteId = formData.get("paqueteId") as string;
    const destino = formData.get("destino") as string;
    const fechaSalida = formData.get("fechaSalida") as string;
    const fechaRegreso = formData.get("fechaRegreso") as string;
    const formaPago = formData.get("formaPago") as string;
    const tipoPago = (formData.get("tipoPago") as string) || "completo";
    const montoTotal = formData.get("montoTotal") as string;
    const montoPagado = formData.get("montoPagado") as string;
    const moneda = (formData.get("moneda") as string) || "EUR";
    const notas = formData.get("notas") as string;

    if (!nombre || !apellidos || !telefono) {
      return NextResponse.json({ error: "Nombre, apellidos y teléfono son obligatorios" }, { status: 400 });
    }

    const esEfectivo = formaPago === "efectivo";
    const esAgente = session.user.rol === "agente";
    const montoTotalNum = Number(montoTotal || montoPagado || 0);
    const montoPagadoNum = Number(montoPagado || 0);
    const pagado = tipoPago === "completo" || montoPagadoNum >= montoTotalNum;

    // Estado inicial:
    // - sin pago definido → pendiente_pago
    // - plan de pagos incompleto → pendiente_pago (con primer abono registrado)
    // - pagó algo o pago completo → pendiente_confirmacion (admin debe confirmar)
    let estado: "pendiente_pago" | "pendiente_confirmacion" | "pagado" | "cancelado" | "pendiente" | "pendiente_admin" | "activo" | "devuelto" = "pendiente_pago";
    if (formaPago && montoPagadoNum > 0) {
      // Cualquier pago inicial (completo o primer abono de plan de pagos)
      // → pendiente_confirmacion para que el admin revise
      estado = "pendiente_confirmacion";
    } else if (formaPago && montoPagadoNum === 0) {
      estado = "pendiente_pago";
    }

    // Subir imagen documento
    let imagenDocumento: string | undefined;
    const imagenFile = formData.get("imagenDocumento") as File | null;
    if (imagenFile && imagenFile.size > 0) {
      const v = validateFile(imagenFile.type, imagenFile.size, ALLOWED_IMAGE_TYPES);
      if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 });
      const buf = Buffer.from(await imagenFile.arrayBuffer());
      const saved = await saveFile(buf, imagenFile.name, "documentos");
      imagenDocumento = saved.rutaArchivo;
    }

    // Crear cliente
    const [nuevoCliente] = await db.insert(cliente).values({
      nombre, apellidos, email: email || undefined, telefono,
      direccion: direccion || undefined, nacionalidad: nacionalidad || undefined,
      tipoDocumento: tipoDocumento || undefined, numeroDocumento: numeroDocumento || undefined,
      imagenDocumento,
      paqueteId: paqueteId || undefined, destino: destino || undefined,
      fechaSalida: fechaSalida ? new Date(fechaSalida) : undefined,
      fechaRegreso: fechaRegreso ? new Date(fechaRegreso) : undefined,
      formaPago: formaPago as any,
      tipoPago: tipoPago as any,
      montoTotal: montoTotal || montoPagado || undefined,
      montoPagado: montoPagado || undefined,
      moneda, notas: notas || undefined, estado,
      agenteId: session.user.id,
      adminId: !esAgente ? session.user.id : undefined,
    }).returning();

    // Registrar primer pago si hay monto
    if (montoPagado && Number(montoPagado) > 0 && formaPago) {
      const comprobanteFile = formData.get("comprobantePago") as File | null;
      let comprobanteRuta: string | undefined;
      if (comprobanteFile && comprobanteFile.size > 0) {
        const v = validateFile(comprobanteFile.type, comprobanteFile.size, ALLOWED_DOC_TYPES);
        if (v.valid) {
          const buf = Buffer.from(await comprobanteFile.arrayBuffer());
          const saved = await saveFile(buf, comprobanteFile.name, "comprobantes");
          comprobanteRuta = saved.rutaArchivo;
        }
      }
      await db.insert(pagoCliente).values({
        clienteId: nuevoCliente.id, monto: montoPagado,
        formaPago: formaPago as any, comprobante: comprobanteRuta,
        notas: "Pago inicial al registrar", registradoPor: session.user.id,
      });
    }

    // Notificar al admin: nuevo cliente
    await crearNotificacion({
      tipo: "cliente_nuevo",
      titulo: "Nuevo cliente registrado",
      mensaje: `${nombre} ${apellidos} fue registrado por ${(session.user as any).name || session.user.email}`,
      paraAdmin: true,
      clienteId: nuevoCliente.id,
    });

    return NextResponse.json(nuevoCliente, { status: 201 });
  } catch (error) {
    console.error("Error creando cliente:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}