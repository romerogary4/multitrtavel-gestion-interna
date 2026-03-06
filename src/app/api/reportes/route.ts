import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cliente, pagoCliente, user, devolucion } from "@/db/schema";
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
    }).from(cliente).where(where);

    // Ingresos reales desde pago_cliente (con filtros de fecha si aplica)
    const pagoConditions = [];
    if (desde) { const d = new Date(desde); d.setHours(0, 0, 0, 0); pagoConditions.push(gte(pagoCliente.creadoEn, d)); }
    if (hasta) { const h = new Date(hasta); h.setHours(23, 59, 59, 999); pagoConditions.push(lte(pagoCliente.creadoEn, h)); }
    const [pagos] = await db.select({
      totalIngresos: sql<number>`coalesce(sum(${pagoCliente.monto}::numeric),0)`,
      ingresoEfectivo: sql<number>`coalesce(sum(${pagoCliente.monto}::numeric) filter (where ${pagoCliente.formaPago}='efectivo'),0)`,
      ingresoTransferencia: sql<number>`coalesce(sum(${pagoCliente.monto}::numeric) filter (where ${pagoCliente.formaPago}='transferencia'),0)`,
      ingresoTarjeta: sql<number>`coalesce(sum(${pagoCliente.monto}::numeric) filter (where ${pagoCliente.formaPago}='tarjeta'),0)`,
    }).from(pagoCliente)
      .where(and(
        ...(pagoConditions.length > 0 ? pagoConditions : []),
        eq(pagoCliente.confirmado, true)
      ));

    // Total devoluciones (con filtro de fecha si aplica)
    const devConditions = [];
    if (desde) { const d = new Date(desde); d.setHours(0, 0, 0, 0); devConditions.push(gte(devolucion.creadoEn, d)); }
    if (hasta) { const h = new Date(hasta); h.setHours(23, 59, 59, 999); devConditions.push(lte(devolucion.creadoEn, h)); }
    const [devs] = await db.select({ total: sql<number>`coalesce(sum(${devolucion.monto}::numeric),0)` })
      .from(devolucion)
      .where(devConditions.length > 0 ? and(...devConditions) : undefined);
    return NextResponse.json({ ...stats, ...pagos, totalDevoluciones: devs.total });
  }

  if (tipo === "por_agente") {
    const agentes = await db.select({
      agenteId: cliente.agenteId,
      agenteName: user.name,
      totalClientes: sql<number>`count(distinct ${cliente.id})`,
      clientesActivos: sql<number>`count(distinct ${cliente.id}) filter (where ${cliente.estado} in ('pagado','activo') and ${cliente.estado} != 'devuelto')`,
      totalIngresos: sql<number>`coalesce(sum(${pagoCliente.monto}::numeric) filter (where ${pagoCliente.confirmado} = true),0)`,
    })
      .from(cliente)
      .leftJoin(user, eq(cliente.agenteId, user.id))
      .leftJoin(pagoCliente, eq(pagoCliente.clienteId, cliente.id))
      .where(where)
      .groupBy(cliente.agenteId, user.name);
    return NextResponse.json(agentes.filter((a: any) => a.agenteName));
  }

  return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
}