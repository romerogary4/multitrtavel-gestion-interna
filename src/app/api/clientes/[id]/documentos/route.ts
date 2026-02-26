import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documento, cliente } from "@/db/schema";
import { getServerSession } from "@/lib/auth-helpers";
import { saveFile, ALLOWED_DOC_TYPES, validateFile, deleteFile } from "@/lib/upload";
import { eq, and } from "drizzle-orm";

// POST /api/clientes/[id]/documentos
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: clienteId } = await params;

  // Verificar que el cliente existe y el agente tiene acceso
  const clienteData = await db.query.cliente.findFirst({
    where: eq(cliente.id, clienteId),
  });

  if (!clienteData) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  if (session.user.rol === "agente" && clienteData.agenteId !== session.user.id) {
    return NextResponse.json({ error: "Sin acceso a este cliente" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const archivo = formData.get("archivo") as File;
    const nombre = formData.get("nombre") as string;
    const tipo = formData.get("tipo") as string || "documentacion";

    if (!archivo || archivo.size === 0) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    const validation = validateFile(archivo.type, archivo.size, ALLOWED_DOC_TYPES);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const saved = await saveFile(buffer, archivo.name, `clientes/${clienteId}`);

    const [doc] = await db
      .insert(documento)
      .values({
        clienteId,
        nombre: nombre || archivo.name,
        tipo,
        rutaArchivo: saved.rutaArchivo,
        nombreOriginal: saved.nombreOriginal,
        mimeType: archivo.type,
        tamano: saved.tamano,
        subidoPor: session.user.id,
      })
      .returning();

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("Error subiendo documento:", error);
    return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 });
  }
}

// DELETE /api/clientes/[id]/documentos/[docId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const docId = searchParams.get("docId");

  if (!docId) return NextResponse.json({ error: "docId requerido" }, { status: 400 });

  const doc = await db.query.documento.findFirst({
    where: eq(documento.id, docId),
  });

  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  await deleteFile(doc.rutaArchivo);
  await db.delete(documento).where(eq(documento.id, docId));

  return NextResponse.json({ ok: true });
}
