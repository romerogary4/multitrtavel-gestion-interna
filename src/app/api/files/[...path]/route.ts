import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getServerSession } from "@/lib/auth-helpers";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(CONTENT_TYPES));

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Autenticación requerida
  const session = await getServerSession();
  if (!session) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { path: pathParts } = await params;

  // Sanitizar cada parte del path
  const sanitized = pathParts.map(p => path.basename(p));
  const filePath = path.join(UPLOAD_DIR, ...sanitized);

  // Seguridad: evitar path traversal
  const resolvedPath = path.resolve(filePath);
  const resolvedUploadDir = path.resolve(UPLOAD_DIR);
  if (!resolvedPath.startsWith(resolvedUploadDir + path.sep) &&
    resolvedPath !== resolvedUploadDir) {
    return new NextResponse("Acceso denegado", { status: 403 });
  }

  // Validar extensión permitida
  const ext = path.extname(resolvedPath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return new NextResponse("Tipo de archivo no permitido", { status: 403 });
  }

  try {
    const file = await fs.readFile(resolvedPath);
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        // No-cache para que siempre sirva la versión actual
        "Cache-Control": "private, no-cache, must-revalidate",
        // Forzar descarga para PDFs en algunos contextos — opcional
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Archivo no encontrado", { status: 404 });
  }
}