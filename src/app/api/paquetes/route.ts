import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { paquete } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import type { AppSession } from "@/types";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const soloActivos = searchParams.get("activos") !== "false";
    const paquetes = await db.query.paquete.findMany({
      where: soloActivos ? eq(paquete.activo, true) : undefined,
      orderBy: (p, { asc }) => [asc(p.nombre)],
    });
    return NextResponse.json(paquetes);
  } catch (error) {
    console.error("Error cargando paquetes:", error);
    return NextResponse.json({ error: "Error al cargar paquetes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { nombre, descripcion } = body;
    if (!nombre?.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    const [nuevoPaquete] = await db.insert(paquete)
      .values({ nombre: nombre.trim(), descripcion, creadoPor: session.user.id })
      .returning();
    return NextResponse.json(nuevoPaquete, { status: 201 });
  } catch (error) {
    console.error("Error creando paquete:", error);
    return NextResponse.json({ error: "Error al crear paquete" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const body = await request.json();
    const [updated] = await db.update(paquete)
      .set({ nombre: body.nombre, descripcion: body.descripcion, activo: body.activo })
      .where(eq(paquete.id, id)).returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error actualizando paquete:", error);
    return NextResponse.json({ error: "Error al actualizar paquete" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    await db.update(paquete).set({ activo: false }).where(eq(paquete.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error desactivando paquete:", error);
    return NextResponse.json({ error: "Error al desactivar paquete" }, { status: 500 });
  }
}
