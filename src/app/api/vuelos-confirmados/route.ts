import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { validacionVuelos } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import { eq } from "drizzle-orm";
import type { AppSession } from "@/types";

const ROLES_PERMITIDOS = ["administrador", "agente_clientes"];

export async function PATCH(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!ROLES_PERMITIDOS.includes(session.user.rol)) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { clienteId, campo, valor, comentario } = await request.json();
    if (!clienteId || !campo) return NextResponse.json({ error: "clienteId y campo requeridos" }, { status: 400 });
    if (!["ida", "vuelta"].includes(campo)) return NextResponse.json({ error: "campo inválido" }, { status: 400 });

    const existing = await db.query.validacionVuelos.findFirst({
        where: eq(validacionVuelos.clienteId, clienteId),
    });

    const now = new Date();
    const updateData: any = {
        actualizadoPor: session.user.id,
        actualizadoEn: now,
    };

    if (campo === "ida") {
        updateData.idaConfirmada = valor;
        updateData.idaComentario = comentario || null;
        updateData.idaConfirmadaEn = valor ? now : null;
    } else {
        updateData.vueltaConfirmada = valor;
        updateData.vueltaComentario = comentario || null;
        updateData.vueltaConfirmadaEn = valor ? now : null;
    }

    if (existing) {
        await db.update(validacionVuelos).set(updateData).where(eq(validacionVuelos.clienteId, clienteId));
    } else {
        await db.insert(validacionVuelos).values({ clienteId, ...updateData });
    }

    return NextResponse.json({ ok: true });
}