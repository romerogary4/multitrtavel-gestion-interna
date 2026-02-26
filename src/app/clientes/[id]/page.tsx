export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { cliente } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate, FORMA_PAGO_LABELS, ESTADO_CLIENTE_LABELS, TIPO_SERVICIO_LABELS } from "@/lib/utils";
import Link from "next/link";
import { ClienteDetailClient } from "./client";

interface Props { params: Promise<{ id: string }> }

export default async function ClienteDetailPage({ params }: Props) {
  const session = await requireAuth();
  const { id } = await params;
  const esAdmin = session.user.rol === "administrador";

  const clienteData = await db.query.cliente.findFirst({
    where: esAdmin ? eq(cliente.id, id) : and(eq(cliente.id, id), eq(cliente.agenteId, session.user.id)),
    with: {
      paquete: true,
      agente: { columns: { id: true, name: true, email: true, image: true } },
      documentos: { orderBy: (d: any, { desc }: any) => [desc(d.subidoEn)] },
      pagos: { orderBy: (p: any, { desc }: any) => [desc(p.creadoEn)], with: { registradoPor: { columns: { name: true } } } },
      devoluciones: { orderBy: (d: any, { desc }: any) => [desc(d.creadoEn)] },
      serviciosEspeciales: {
        with: { agente: { columns: { name: true } }, admin: { columns: { name: true } } },
        orderBy: (s: any, { desc }: any) => [desc(s.creadoEn)],
      },
    },
  });

  if (!clienteData) notFound();

  return (
    <ClienteDetailClient
      clienteData={JSON.parse(JSON.stringify(clienteData))}
      esAdmin={esAdmin}
      sessionUserId={session.user.id}
    />
  );
}
