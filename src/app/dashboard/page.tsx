export const dynamic = "force-dynamic";
export const revalidate = 0;

import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { cliente, servicioEspecial } from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { DashboardClient } from "./client";

export default async function DashboardPage() {
  const session = await requireAuth();
  const esAdmin = session.user.rol === "administrador";
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hoyISO = hoy.toISOString();

  const cond = esAdmin ? undefined : eq(cliente.agenteId, session.user.id);

  const [stats] = await db.select({
    total: sql<number>`count(*)`,
    pendientesConfirmacion: sql<number>`count(*) filter (where ${cliente.estado} in ('pendiente_confirmacion','pendiente_admin'))`,
    pendientesPago: sql<number>`count(*) filter (where ${cliente.estado} in ('pendiente_pago','pendiente'))`,
    pagados: sql<number>`count(*) filter (where ${cliente.estado} in ('pagado','activo'))`,
    ingresoTotal: sql<number>`coalesce(sum(${cliente.montoPagado}::numeric) filter (where ${cliente.estado} not in ('cancelado','devuelto')),0)`,
    clientesHoy: sql<number>`count(*) filter (where ${cliente.creadoEn} >= ${hoyISO}::timestamptz)`,
  }).from(cliente).where(cond);

  // Servicios especiales pendientes
  const [srvPend] = await db.select({ count: sql<number>`count(*)` })
    .from(servicioEspecial)
    .where(esAdmin
      ? eq(servicioEspecial.estado, "pendiente")
      : and(eq(servicioEspecial.agenteId, session.user.id), eq(servicioEspecial.estado, "pendiente"))
    );
  const serviciosPendientes = Number(srvPend.count);

  const recientes = await db.query.cliente.findMany({
    where: cond,
    with: {
      paquete: { columns: { nombre: true } },
      agente: { columns: { name: true, image: true } },
    },
    orderBy: [desc(cliente.creadoEn)],
    limit: 5,
  });

  const pendConf = Number(stats.pendientesConfirmacion);

  const kpis = esAdmin ? [
    { label: "Total clientes", value: String(stats.total), sub: `+${stats.clientesHoy} hoy`, accent: "#cc1111", icon: "👥" },
    { label: "Pagados", value: String(stats.pagados), sub: "Confirmados", accent: "#16a34a", icon: "✅" },
    { label: "Pend. confirmación", value: String(pendConf), sub: "Requieren revisión", accent: pendConf > 0 ? "#7c3aed" : "#16a34a", icon: pendConf > 0 ? "🔔" : "✅" },
    { label: "Ingresos totales", value: formatCurrency(stats.ingresoTotal), sub: "Acumulado general", accent: "#d97706", icon: "💰" },
  ] : [
    { label: "Mis clientes", value: String(stats.total), sub: `+${stats.clientesHoy} hoy`, accent: "#cc1111", icon: "👥" },
    { label: "Pagados", value: String(stats.pagados), sub: "Confirmados", accent: "#16a34a", icon: "✅" },
    { label: "Pend. confirmación", value: String(pendConf), sub: "Esperando admin", accent: pendConf > 0 ? "#7c3aed" : "#16a34a", icon: pendConf > 0 ? "🔔" : "✅" },
    { label: "Mis ventas acumuladas", value: formatCurrency(stats.ingresoTotal), sub: "Todos mis clientes", accent: "#d97706", icon: "💰" },
  ];

  const clientesData = recientes.map(c => ({
    id: c.id, nombre: c.nombre, apellidos: c.apellidos,
    paquete: c.paquete?.nombre || null,
    agente: c.agente?.name || null,
    agenteImage: c.agente?.image || null,
    montoPagado: c.montoPagado || null,
    estado: c.estado,
  }));

  return (
    <div>
      <div className="page-header animate-fade-up">
        <div>
          <h1 className="page-title" style={{ fontSize: 30 }}>
            Hola, {session.user.name?.split(" ")[0]} 👋
          </h1>
          <p style={{ fontSize: 14, color: "#9ca3af", marginTop: 4, marginLeft: 14 }}>
            {new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/clientes/nuevo" className="btn-primary"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
          ➕ Nuevo cliente
        </Link>
      </div>

      <DashboardClient
        kpis={kpis}
        clientes={clientesData}
        esAdmin={esAdmin}
        pendientesConfirmacion={pendConf}
        serviciosPendientes={serviciosPendientes}
      />
    </div>
  );
}