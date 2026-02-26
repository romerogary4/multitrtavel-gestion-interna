import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tarea, user } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import { crearNotificacion } from "@/lib/notificaciones";
import type { AppSession } from "@/types";
import { eq, and, or, lte, isNull, isNotNull, desc, gte } from "drizzle-orm";

// GET /api/tareas — obtener tareas del usuario actual
export async function GET(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo"); // "pendientes_recordatorio"

    // Verificar recordatorios vencidos — se llama desde el polling de la campana
    if (tipo === "recordatorios") {
        const ahora = new Date();
        const tareasConRecordatorio = await db.query.tarea.findMany({
            where: and(
                or(
                    eq(tarea.creadoPor, session.user.id),
                    eq(tarea.asignadoA, session.user.id)
                ),
                eq(tarea.completada, false),
                eq(tarea.recordatorioEnviado, false),
                isNotNull(tarea.recordatorio),
                lte(tarea.recordatorio, ahora)
            ),
        });

        // Marcar como enviados y crear notificaciones
        for (const t of tareasConRecordatorio) {
            await db.update(tarea)
                .set({ recordatorioEnviado: true, actualizadoEn: new Date() })
                .where(eq(tarea.id, t.id));

            await crearNotificacion({
                tipo: "estado_cliente", // reutilizamos tipo genérico
                titulo: "⏰ Recordatorio de tarea",
                mensaje: t.titulo,
                paraAgenteId: session.user.rol === "agente" ? session.user.id : undefined,
                paraAdmin: session.user.rol === "administrador",
            });
        }

        return NextResponse.json({ recordatoriosActivados: tareasConRecordatorio.length });
    }

    // Listado normal — tareas propias + asignadas al usuario
    const tareas = await db.query.tarea.findMany({
        where: or(
            eq(tarea.creadoPor, session.user.id),
            eq(tarea.asignadoA, session.user.id)
        ),
        with: {
            creadoPor: { columns: { name: true, image: true } },
            asignadoA: { columns: { name: true, image: true } },
        },
        orderBy: (t: any, { asc, desc }: any) => [
            asc(t.completada),
            desc(t.prioridad),
            asc(t.fechaLimite),
            desc(t.creadoEn),
        ],
    });

    // Contar pendientes para badge
    const pendientes = tareas.filter((t: any) => !t.completada).length;
    const vencidas = tareas.filter((t: any) =>
        !t.completada && t.fechaLimite && new Date(t.fechaLimite) < new Date()
    ).length;

    return NextResponse.json({ tareas, pendientes, vencidas });
}

// POST /api/tareas — crear tarea
export async function POST(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { titulo, descripcion, prioridad, fechaLimite, recordatorio, asignadoA } = body;

    if (!titulo?.trim()) return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });

    // Solo admin puede asignar a otros
    const asignado = session.user.rol === "administrador" ? (asignadoA || null) : null;

    const [nueva] = await db.insert(tarea).values({
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        prioridad: prioridad || "media",
        fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
        recordatorio: recordatorio ? new Date(recordatorio) : null,
        creadoPor: session.user.id,
        asignadoA: asignado,
    }).returning();

    // Notificar al agente si el admin le asignó una tarea
    if (asignado && asignado !== session.user.id) {
        await crearNotificacion({
            tipo: "estado_cliente",
            titulo: "📋 Nueva tarea asignada",
            mensaje: `${(session.user as any).name || "Admin"} te asignó: ${titulo.trim()}`,
            paraAgenteId: asignado,
        });
    }

    return NextResponse.json(nueva, { status: 201 });
}

// PATCH /api/tareas?id=xxx — actualizar tarea
export async function PATCH(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    // Verificar que la tarea pertenece al usuario
    const existente = await db.query.tarea.findFirst({
        where: and(
            eq(tarea.id, id),
            or(
                eq(tarea.creadoPor, session.user.id),
                eq(tarea.asignadoA, session.user.id)
            )
        ),
    });
    if (!existente) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

    const body = await request.json();
    const updates: any = { actualizadoEn: new Date() };

    if (body.titulo !== undefined) updates.titulo = body.titulo.trim();
    if (body.descripcion !== undefined) updates.descripcion = body.descripcion?.trim() || null;
    if (body.prioridad !== undefined) updates.prioridad = body.prioridad;
    if (body.fechaLimite !== undefined) updates.fechaLimite = body.fechaLimite ? new Date(body.fechaLimite) : null;
    if (body.recordatorio !== undefined) {
        updates.recordatorio = body.recordatorio ? new Date(body.recordatorio) : null;
        updates.recordatorioEnviado = false; // resetear si cambia el recordatorio
    }
    if (body.asignadoA !== undefined && session.user.rol === "administrador") {
        updates.asignadoA = body.asignadoA || null;
    }
    if (body.completada !== undefined) {
        updates.completada = body.completada;
        updates.completadaEn = body.completada ? new Date() : null;
    }

    const [updated] = await db.update(tarea)
        .set(updates)
        .where(eq(tarea.id, id))
        .returning();

    return NextResponse.json(updated);
}

// DELETE /api/tareas?id=xxx — eliminar tarea
export async function DELETE(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    // Solo puede borrar el creador o un admin
    const existente = await db.query.tarea.findFirst({
        where: eq(tarea.id, id),
    });
    if (!existente) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });

    if (existente.creadoPor !== session.user.id && session.user.rol !== "administrador") {
        return NextResponse.json({ error: "Sin permiso para borrar esta tarea" }, { status: 403 });
    }

    await db.delete(tarea).where(eq(tarea.id, id));
    return NextResponse.json({ ok: true });
}