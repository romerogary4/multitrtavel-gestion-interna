import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { devolucion, cliente } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import { eq } from "drizzle-orm";
import { saveFile, ALLOWED_DOC_TYPES, validateFile } from "@/lib/upload";
import type { AppSession } from "@/types";

export async function GET(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const clienteId = new URL(request.url).searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });
  try {
    const devoluciones = await db.query.devolucion.findMany({
      where: eq(devolucion.clienteId, clienteId),
      with: { procesadoPor: { columns: { name: true } } },
      orderBy: (d, { desc }) => [desc(d.creadoEn)],
    });
    return NextResponse.json(devoluciones);
  } catch (error) {
    console.error("Error cargando devoluciones:", error);
    return NextResponse.json({ error: "Error al cargar devoluciones" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores pueden procesar devoluciones" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const clienteId = formData.get("clienteId") as string;
    const monto = formData.get("monto") as string;
    const motivo = formData.get("motivo") as string;

    if (!clienteId || !monto || !motivo) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const montoNum = Number(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    // Verificar cliente y que la devolución no supere lo pagado
    const cli = await db.query.cliente.findFirst({ where: eq(cliente.id, clienteId) });
    if (!cli) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    const montoPagado = Number(cli.montoPagado || 0);
    if (montoNum > montoPagado) {
      return NextResponse.json({
        error: `La devolución (${montoNum} €) no puede superar lo pagado (${montoPagado} €)`
      }, { status: 400 });
    }

    // Subir comprobante
    let comprobanteRuta: string | undefined;
    const archivo = formData.get("comprobante") as File | null;
    if (archivo && archivo.size > 0) {
      const v = validateFile(archivo.type, archivo.size, ALLOWED_DOC_TYPES);
      if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 });
      const buf = Buffer.from(await archivo.arrayBuffer());
      const saved = await saveFile(buf, archivo.name, "devoluciones");
      comprobanteRuta = saved.rutaArchivo;
    }

    // Transacción atómica
    await db.transaction(async (tx) => {
      await tx.insert(devolucion).values({
        clienteId, monto, motivo,
        comprobante: comprobanteRuta,
        procesadoPor: session.user.id,
      });

      const nuevoMonto = Math.max(0, montoPagado - montoNum);
      await tx.update(cliente).set({
        montoPagado: String(nuevoMonto),
        estado: "devuelto",
        actualizadoEn: new Date(),
      }).where(eq(cliente.id, clienteId));
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error procesando devolución:", error);
    return NextResponse.json({ error: "Error al procesar la devolución" }, { status: 500 });
  }
}
