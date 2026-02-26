import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getServerSession } from "@/lib/auth-helpers";
import type { AppSession } from "@/types";
import { eq } from "drizzle-orm";

// GET /api/admin/agentes
export async function GET(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const agentes = await db.query.user.findMany({
    columns: {
      id: true,
      name: true,
      email: true,
      rol: true,
      activo: true,
      createdAt: true,
    },
    orderBy: (u, { asc }) => [asc(u.name)],
  });

  return NextResponse.json(agentes);
}

// POST /api/admin/agentes - Crear agente
export async function POST(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, password, rol } = body;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "name, email y password son obligatorios" },
      { status: 400 }
    );
  }

  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    if (rol === "administrador") {
      await db
        .update(user)
        .set({ rol: "administrador" })
        .where(eq(user.id, result.user.id));
    }

    return NextResponse.json({ ok: true, userId: result.user.id }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("email")) {
      return NextResponse.json({ error: "Email ya existe" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error creando usuario" }, { status: 500 });
  }
}

// PATCH /api/admin/agentes - Actualizar agente
export async function PATCH(request: NextRequest) {
  const session = await getServerSession() as AppSession | null;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "administrador") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const body = await request.json();
  const { name, rol, activo } = body;

  const updateData: any = {};
  if (name) updateData.name = name;
  if (rol) updateData.rol = rol;
  if (activo !== undefined) updateData.activo = activo;

  const [updated] = await db
    .update(user)
    .set(updateData)
    .where(eq(user.id, id))
    .returning({ id: user.id, name: user.name, email: user.email, rol: user.rol, activo: user.activo });

  return NextResponse.json(updated);
}
