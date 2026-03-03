import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { docSolicitud, docSolicitudHistorial } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import { eq, desc, and } from "drizzle-orm";
import { saveFile, deleteFile, ALLOWED_DOC_TYPES, validateFile } from "@/lib/upload";
import type { AppSession } from "@/types";

// GET — listar solicitudes
export async function GET(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const esAdmin = session.user.rol === "administrador";

    const conditions: any[] = [];
    if (estado && estado !== "todos") conditions.push(eq(docSolicitud.estado, estado as any));

    const solicitudes = await db.query.docSolicitud.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
            creadoPorUser: { columns: { name: true, image: true } },
            historial: {
                with: { creadoPorUser: { columns: { name: true } } },
                orderBy: (h: any, { asc }: any) => [asc(h.creadoEn)],
            },
        },
        orderBy: [desc(docSolicitud.actualizadoEn)],
    });

    return NextResponse.json(solicitudes);
}

// POST — crear solicitud
export async function POST(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { titulo, descripcion } = body;
    if (!titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

    const [nueva] = await db.insert(docSolicitud).values({
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        creadoPor: session.user.id,
    }).returning();

    await db.insert(docSolicitudHistorial).values({
        solicitudId: nueva.id,
        estadoAnterior: null,
        estadoNuevo: "solicitado",
        nota: "Solicitud creada",
        creadoPor: session.user.id,
    });

    return NextResponse.json(nueva, { status: 201 });
}

// PATCH — cambiar estado con comprobante opcional
export async function PATCH(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await request.formData();
    const id = formData.get("id") as string;
    const nuevoEstado = formData.get("estado") as string;
    const nota = formData.get("nota") as string | null;

    if (!id || !nuevoEstado) return NextResponse.json({ error: "id y estado requeridos" }, { status: 400 });

    const solicitud = await db.query.docSolicitud.findFirst({ where: eq(docSolicitud.id, id) });
    if (!solicitud) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

    const esAdmin = session.user.rol === "administrador";
    const esSenior = session.user.rol === "agente_senior";
    if (!esAdmin && !esSenior) {
        return NextResponse.json({ error: "Solo agentes senior y administradores pueden cambiar el estado" }, { status: 403 });
    }

    let comprobanteRuta: string | undefined;
    const archivo = formData.get("comprobante") as File | null;
    if (archivo && archivo.size > 0) {
        const v = validateFile(archivo.type, archivo.size, ALLOWED_DOC_TYPES);
        if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 });
        const buf = Buffer.from(await archivo.arrayBuffer());
        const saved = await saveFile(buf, archivo.name, "documentacion");
        comprobanteRuta = saved.rutaArchivo;
    }

    await db.update(docSolicitud).set({
        estado: nuevoEstado as any,
        actualizadoEn: new Date(),
    }).where(eq(docSolicitud.id, id));

    await db.insert(docSolicitudHistorial).values({
        solicitudId: id,
        estadoAnterior: solicitud.estado,
        estadoNuevo: nuevoEstado,
        nota: nota || null,
        comprobante: comprobanteRuta || null,
        creadoPor: session.user.id,
    });

    return NextResponse.json({ ok: true });
}

// DELETE — solo admin
export async function DELETE(request: NextRequest) {
    const session = await getServerSession() as AppSession | null;
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (session.user.rol !== "administrador") {
        return NextResponse.json({ error: "Solo administradores pueden eliminar" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    if (tipo === "comprobante") {
        const h = await db.query.docSolicitudHistorial.findFirst({
            where: eq(docSolicitudHistorial.id, id),
        });
        if (!h) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
        if (h.comprobante) await deleteFile(h.comprobante);
        await db.update(docSolicitudHistorial).set({ comprobante: null }).where(eq(docSolicitudHistorial.id, id));
        return NextResponse.json({ ok: true });
    }

    await db.delete(docSolicitud).where(eq(docSolicitud.id, id));
    return NextResponse.json({ ok: true });
}