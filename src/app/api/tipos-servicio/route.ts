import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tipoServicio } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import type { AppSession } from "@/types";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const tipos = await db.select().from(tipoServicio).orderBy(asc(tipoServicio.orden));
    return NextResponse.json(tipos);
  } catch (error) {
    console.error("Error cargando tipos de servicio:", error);
    return NextResponse.json({ error: "Error al cargar tipos de servicio" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  try {
    const body = await request.json();
    const { nombre, icono, descripcion, precioBase } = body;
    if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const todos = await db.select({ orden: tipoServicio.orden }).from(tipoServicio).orderBy(asc(tipoServicio.orden));
    const maxOrden = todos.length > 0 ? Math.max(...todos.map(t => t.orden)) : 0;
    const [nuevo] = await db.insert(tipoServicio).values({
      nombre: nombre.trim(), icono: icono || "⭐",
      descripcion: descripcion?.trim() || null,
      precioBase: precioBase || null,
      orden: maxOrden + 1,
    }).returning();
    return NextResponse.json(nuevo, { status: 201 });
  } catch (error) {
    console.error("Error creando tipo servicio:", error);
    return NextResponse.json({ error: "Error al crear tipo de servicio" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  try {
    const body = await request.json();
    const { id, nombre, icono, descripcion, precioBase, activo } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const [updated] = await db.update(tipoServicio).set({
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(icono !== undefined && { icono }),
      ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
      ...(precioBase !== undefined && { precioBase: precioBase || null }),
      ...(activo !== undefined && { activo }),
    }).where(eq(tipoServicio.id, id)).returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error actualizando tipo servicio:", error);
    return NextResponse.json({ error: "Error al actualizar tipo de servicio" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    await db.update(tipoServicio).set({ activo: false }).where(eq(tipoServicio.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error desactivando tipo servicio:", error);
    return NextResponse.json({ error: "Error al desactivar tipo de servicio" }, { status: 500 });
  }
}
