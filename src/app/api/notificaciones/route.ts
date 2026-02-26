import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificacion } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import type { AppSession } from "@/types";
import { eq, and, or, desc, isNull } from "drizzle-orm";

// GET /api/notificaciones — obtener las del usuario actual
export async function GET(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const esAdmin = session.user.rol === "administrador";

    // Admin ve: las de paraAdmin=true (globales) + las suyas propias
    // Agente ve: solo las que tienen su userId
    const notifs = await db.query.notificacion.findMany({
        where: esAdmin
            ? or(
                eq(notificacion.paraAdmin, true),
                eq(notificacion.userId, session.user.id)
            )
            : and(
                eq(notificacion.paraAgente, true),
                eq(notificacion.userId, session.user.id)
            ),
        orderBy: [desc(notificacion.creadoEn)],
        limit: 50,
    });

    const noLeidas = notifs.filter((n: any) => !n.leida).length;
    return NextResponse.json({ notificaciones: notifs, noLeidas });
}

// PATCH /api/notificaciones — marcar como leída(s)
export async function PATCH(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const todas = searchParams.get("todas") === "true";

    const esAdmin = session.user.rol === "administrador";

    if (todas) {
        // Marcar todas como leídas — para este usuario
        const whereAdmin = and(
            eq(notificacion.paraAdmin, true),
            eq(notificacion.leida, false)
        );
        const whereAgente = and(
            eq(notificacion.userId, session.user.id),
            eq(notificacion.leida, false)
        );
        await db.update(notificacion)
            .set({ leida: true })
            .where(esAdmin ? or(whereAdmin, whereAgente) : whereAgente);
        return NextResponse.json({ ok: true });
    }

    if (id) {
        await db.update(notificacion)
            .set({ leida: true })
            .where(eq(notificacion.id, id));
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
}