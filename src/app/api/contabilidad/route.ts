import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contabilidadCliente, cliente, pagoCliente, paquete, user } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import type { AppSession } from "@/types";

// GET — listar clientes con estado de contabilidad
export async function GET(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (session.user.rol !== "administrador") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    const conditions: any[] = [];
    if (desde) { const d = new Date(desde); d.setHours(0, 0, 0, 0); conditions.push(gte(cliente.creadoEn, d)); }
    if (hasta) { const h = new Date(hasta); h.setHours(23, 59, 59, 999); conditions.push(lte(cliente.creadoEn, h)); }

    const clientes = await db.query.cliente.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
            paquete: { columns: { nombre: true } },
            agente: { columns: { name: true } },
            pagos: {
                where: eq(pagoCliente.confirmado, true),
                columns: { monto: true },
            },
            contabilidad: {
                columns: { contabilizado: true, comentario: true, contabilizadoEn: true },
                with: { contabilizadoPorUser: { columns: { name: true } } },
            },
        },
        orderBy: [desc(cliente.creadoEn)],
    });

    return NextResponse.json(clientes);
}

// PATCH — marcar/desmarcar contabilizado
export async function PATCH(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (session.user.rol !== "administrador") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

    const { clienteId, contabilizado, comentario } = await request.json();
    if (!clienteId) return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });

    // Upsert — si existe actualiza, si no crea
    const existing = await db.query.contabilidadCliente.findFirst({
        where: eq(contabilidadCliente.clienteId, clienteId),
    });

    if (existing) {
        await db.update(contabilidadCliente).set({
            contabilizado,
            comentario: comentario || null,
            contabilizadoEn: contabilizado ? new Date() : null,
            contabilizadoPor: contabilizado ? session.user.id : null,
            actualizadoEn: new Date(),
        }).where(eq(contabilidadCliente.clienteId, clienteId));
    } else {
        await db.insert(contabilidadCliente).values({
            clienteId,
            contabilizado,
            comentario: comentario || null,
            contabilizadoEn: contabilizado ? new Date() : null,
            contabilizadoPor: contabilizado ? session.user.id : null,
        });
    }

    return NextResponse.json({ ok: true });
}