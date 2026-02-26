import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cliente, user, devolucion } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import { eq, and, gte, lte, sql, sum } from "drizzle-orm";
import type { AppSession } from "@/types";

export async function GET(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const conditions = [];
  if (desde) {
    const d = new Date(desde);
    d.setHours(0, 0, 0, 0);
    conditions.push(gte(cliente.creadoEn, d));
  }
  if (hasta) {
    const h = new Date(hasta);
    h.setHours(23, 59, 59, 999);
    conditions.push(lte(cliente.creadoEn, h));
  }
  // Excluir devueltos de las estadísticas
  conditions.push(sql`${cliente.estado} != 'devuelto'`);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  if (tipo === "resumen") {
    const [stats] = await db.select({
      totalClientes: sql<number>`count(*)`,
      clientesActivos: sql<number>`count(*) filter (where ${cliente.estado} in ('pagado','activo'))`,
      clientesPendientes: sql<number>`count(*) filter (where ${cliente.estado} in ('pendiente_pago','pendiente'))`,
      clientesPendienteAdmin: sql<number>`count(*) filter (where ${cliente.estado} in ('pendiente_confirmacion','pendiente_admin'))`,
      totalIngresos: sql<number>`coalesce(sum(${cliente.montoPagado}::numeric),0)`,
      ingresoEfectivo: sql<number>`coalesce(sum(${cliente.montoPagado}::numeric) filter (where ${cliente.formaPago}='efectivo'),0)`,
      ingresoTransferencia: sql<number>`coalesce(sum(${cliente.montoPagado}::numeric) filter (where ${cliente.formaPago}='transferencia'),0)`,
      ingresoTarjeta: sql<number>`coalesce(sum(${cliente.montoPagado}::numeric) filter (where ${cliente.formaPago}='tarjeta'),0)`,
    }).from(cliente).where(where);

    // Total devoluciones
    const [devs] = await db.select({ total: sql<number>`coalesce(sum(${devolucion.monto}::numeric),0)` }).from(devolucion);
    return NextResponse.json({ ...stats, totalDevoluciones: devs.total });
  }

  if (tipo === "por_agente") {
    const agentes = await db.select({
      agenteId: cliente.agenteId,
      agenteName: user.name,
      totalClientes: sql<number>`count(*)`,
      clientesActivos: sql<number>`count(*) filter (where ${cliente.estado} in ('pagado','activo'))`,
      totalIngresos: sql<number>`coalesce(sum(${cliente.montoPagado}::numeric),0)`,
    })
      .from(cliente)
      .leftJoin(user, eq(cliente.agenteId, user.id))
      .where(where)
      .groupBy(cliente.agenteId, user.name);
    return NextResponse.json(agentes);
  }

  return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
}