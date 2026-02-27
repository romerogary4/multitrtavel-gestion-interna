import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cuadreDiario, cliente, pagoCliente } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import type { AppSession } from "@/types";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha");
  const tipo = searchParams.get("tipo") || "cuadre";

  // ── Cuadre automático del día ──────────────────────────────────────────────
  if (tipo === "automatico") {
    const diaInicio = fecha ? new Date(fecha) : new Date();
    diaInicio.setHours(0, 0, 0, 0);
    const diaFin = new Date(diaInicio);
    diaFin.setHours(23, 59, 59, 999);

    const [totalesPagos] = await db.select({
      ingresoEfectivo: sql<number>`coalesce(sum(${pagoCliente.monto}::numeric) filter (where ${pagoCliente.formaPago}='efectivo'), 0)`,
      ingresoTransferencia: sql<number>`coalesce(sum(${pagoCliente.monto}::numeric) filter (where ${pagoCliente.formaPago}='transferencia'), 0)`,
      ingresoTarjeta: sql<number>`coalesce(sum(${pagoCliente.monto}::numeric) filter (where ${pagoCliente.formaPago}='tarjeta'), 0)`,
      totalPagos: sql<number>`count(*)`,
    }).from(pagoCliente).where(and(
      gte(pagoCliente.creadoEn, diaInicio),
      lte(pagoCliente.creadoEn, diaFin)
    ));

    const [{ totalClientes }] = await db.select({
      totalClientes: sql<number>`count(*)`,
    }).from(cliente).where(and(
      gte(cliente.creadoEn, diaInicio),
      lte(cliente.creadoEn, diaFin)
    ));

    const clientesDelDia = await db.query.cliente.findMany({
      where: and(
        gte(cliente.creadoEn, diaInicio),
        lte(cliente.creadoEn, diaFin),
        sql`${cliente.estado} in ('pagado','activo')`
      ),
      with: {
        paquete: { columns: { nombre: true } },
        agente: { columns: { name: true } },
      },
    });

    const cuadreGuardado = await db.query.cuadreDiario.findFirst({
      where: and(
        gte(cuadreDiario.fecha, diaInicio),
        lte(cuadreDiario.fecha, diaFin)
      ),
    });

    return NextResponse.json({
      totales: {
        ingresoEfectivo: Number(totalesPagos.ingresoEfectivo),
        ingresoTransferencia: Number(totalesPagos.ingresoTransferencia),
        ingresoTarjeta: Number(totalesPagos.ingresoTarjeta),
        totalClientes: Number(totalClientes),
      },
      clientesDelDia,
      cuadreGuardado: cuadreGuardado || null,
    });
  }

  // ── Días pendientes de cierre ──────────────────────────────────────────────
  if (tipo === "pendientes") {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hace30 = new Date(hoy);
    hace30.setDate(hoy.getDate() - 30);

    // 1. Cuadres abiertos (borradores sin cerrar)
    const abiertos = await db.query.cuadreDiario.findMany({
      where: and(
        eq(cuadreDiario.cerrado, false),
        gte(cuadreDiario.fecha, hace30),
        lte(cuadreDiario.fecha, hoy)
      ),
      orderBy: (t: any, { desc }: any) => [desc(t.fecha)],
    });

    // 2. Todos los cuadres en los últimos 30 días (para detectar huecos)
    const todosCuadres = await db.query.cuadreDiario.findMany({
      where: and(
        gte(cuadreDiario.fecha, hace30),
        lte(cuadreDiario.fecha, hoy)
      ),
    });

    const fechasConCuadre = new Set(
      todosCuadres.map((c: any) => new Date(c.fecha).toISOString().split("T")[0])
    );

    // 3. Detectar días SIN cuadre entre hace30 y ayer
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    const diasSinCuadre: { id: string; fecha: string; cerrado: boolean }[] = [];
    const cursor = new Date(hace30);
    while (cursor <= ayer) {
      const dStr = cursor.toISOString().split("T")[0];
      if (!fechasConCuadre.has(dStr)) {
        diasSinCuadre.push({
          id: "sin-cuadre-" + dStr,
          fecha: cursor.toISOString(),
          cerrado: false,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // Combinar y ordenar por fecha desc
    const todos = [
      ...abiertos.map((a: any) => ({ id: a.id, fecha: a.fecha.toISOString(), cerrado: a.cerrado })),
      ...diasSinCuadre,
    ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return NextResponse.json(todos);
  }

  // ── Historial de cuadres cerrados (para Reportes) ─────────────────────────
  const desdeParam = searchParams.get("desde");
  const hastaParam = searchParams.get("hasta");

  const cuadreConditions: any[] = [];
  if (desdeParam) {
    const d = new Date(desdeParam);
    d.setHours(0, 0, 0, 0);
    cuadreConditions.push(gte(cuadreDiario.fecha, d));
  }
  if (hastaParam) {
    const h = new Date(hastaParam);
    h.setHours(23, 59, 59, 999);
    cuadreConditions.push(lte(cuadreDiario.fecha, h));
  }

  const cuadres = await db.query.cuadreDiario.findMany({
    with: { admin: { columns: { name: true } } },
    where: cuadreConditions.length > 0 ? and(...cuadreConditions) : undefined,
    orderBy: (t: any, { desc }: any) => [desc(t.fecha)],
    limit: 60,
  });

  const cuadresConClientes = await Promise.all(cuadres.map(async (c: any) => {
    const diaInicio = new Date(c.fecha); diaInicio.setHours(0, 0, 0, 0);
    const diaFin = new Date(diaInicio); diaFin.setHours(23, 59, 59, 999);
    const clientesDelDia = await db.query.cliente.findMany({
      where: and(
        gte(cliente.creadoEn, diaInicio),
        lte(cliente.creadoEn, diaFin),
        sql`${cliente.estado} not in ('cancelado','devuelto')`
      ),
      with: {
        paquete: { columns: { nombre: true } },
        agente: { columns: { name: true } },
      },
    });
    return { ...c, clientesDelDia };
  }));

  return NextResponse.json(cuadresConClientes);
}

// ── POST: crear o actualizar cuadre del día ────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const body = await request.json();
  const {
    fecha, ingresosEfectivo, ingresosTransferencia, ingresosTarjeta,
    gastosEfectivo, gastosTransferencia, gastosTarjeta,
    notas, detalles, accion,
  } = body;

  const diaInicio = fecha ? new Date(fecha) : new Date();
  diaInicio.setHours(0, 0, 0, 0);
  const diaFin = new Date(diaInicio);
  diaFin.setHours(23, 59, 59, 999);

  const cerrar = accion === "cerrar";

  const existente = await db.query.cuadreDiario.findFirst({
    where: and(
      gte(cuadreDiario.fecha, diaInicio),
      lte(cuadreDiario.fecha, diaFin)
    ),
  });

  const valores = {
    ingresosEfectivo: String(ingresosEfectivo || 0),
    ingresosTransferencia: String(ingresosTransferencia || 0),
    ingresosTarjeta: String(ingresosTarjeta || 0),
    gastosEfectivo: String(gastosEfectivo || 0),
    gastosTransferencia: String(gastosTransferencia || 0),
    gastosTarjeta: String(gastosTarjeta || 0),
    notas: notas || null,
    detalles: detalles || [],
  };

  if (existente) {
    const [updated] = await db.update(cuadreDiario).set({
      ...valores,
      cerrado: cerrar ? true : existente.cerrado,
      cerradoEn: cerrar && !existente.cerrado ? new Date() : existente.cerradoEn,
      actualizadoEn: new Date(),
    }).where(eq(cuadreDiario.id, existente.id)).returning();
    return NextResponse.json(updated);
  }

  const [nuevo] = await db.insert(cuadreDiario).values({
    fecha: diaInicio,
    ...valores,
    cerrado: cerrar,
    cerradoEn: cerrar ? new Date() : undefined,
    adminId: session.user.id,
  }).returning();
  return NextResponse.json(nuevo, { status: 201 });
}

// ── PATCH: actualizar campo específico ────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const body = await request.json();
  const [updated] = await db.update(cuadreDiario)
    .set({ ...body, actualizadoEn: new Date() })
    .where(eq(cuadreDiario.id, id)).returning();
  return NextResponse.json(updated);
}