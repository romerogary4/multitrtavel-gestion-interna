import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Extensiones permitidas (doble validación: MIME + extensión)
const ALLOWED_EXTENSIONS_MAP: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/jpg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

export async function ensureUploadDir(subdir: string = "") {
  const dir = path.join(UPLOAD_DIR, subdir);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  subdir: string = "general"
): Promise<{ rutaArchivo: string; nombreOriginal: string; tamano: number }> {
  // Normalizar separadores (Windows → Linux)
  const normalizedSubdir = subdir.replace(/\\/g, "/");

  const ext = path.extname(originalName).toLowerCase();
  if (!Object.values(ALLOWED_EXTENSIONS_MAP).flat().includes(ext)) {
    throw new Error(`Extensión no permitida: ${ext}`);
  }

  const dir = await ensureUploadDir(normalizedSubdir);
  const fileName = `${randomUUID()}${ext}`;
  const filePath = path.join(dir, fileName);

  await fs.writeFile(filePath, buffer);

  // Ruta relativa con forward slashes siempre
  const rutaRelativa = `${normalizedSubdir}/${fileName}`;

  return {
    rutaArchivo: rutaRelativa,
    nombreOriginal: path.basename(originalName),
    tamano: buffer.length,
  };
}

export async function deleteFile(rutaArchivo: string): Promise<void> {
  try {
    const normalized = rutaArchivo.replace(/\\/g, "/");
    const filePath = path.join(UPLOAD_DIR, normalized);
    // Seguridad: evitar path traversal
    const resolved = path.resolve(filePath);
    const resolvedBase = path.resolve(UPLOAD_DIR);
    if (!resolved.startsWith(resolvedBase)) return;
    await fs.unlink(resolved);
  } catch {
    // Ignorar si el archivo no existe
  }
}

export function getFileUrl(rutaArchivo: string): string {
  const normalized = rutaArchivo.replace(/\\/g, "/");
  return `/api/files/${normalized}`;
}

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(
  mimeType: string,
  size: number,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(", ")}`,
    };
  }
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "El archivo supera el tamaño máximo de 10MB",
    };
  }
  return { valid: true };
}

// Validar extensión además del MIME type
export function validateFileExtension(
  mimeType: string,
  originalName: string
): { valid: boolean; error?: string } {
  const ext = path.extname(originalName).toLowerCase();
  const allowedExts = ALLOWED_EXTENSIONS_MAP[mimeType];
  if (!allowedExts || !allowedExts.includes(ext)) {
    return { valid: false, error: `Extensión ${ext} no corresponde al tipo ${mimeType}` };
  }
  return { valid: true };
}