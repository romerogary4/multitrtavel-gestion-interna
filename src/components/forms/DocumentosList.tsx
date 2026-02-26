"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  rutaArchivo: string;
  nombreOriginal: string;
  mimeType: string;
  tamano?: number;
  subidoEn: string;
}

interface Props {
  clienteId: string;
  documentosIniciales: Documento[];
}

export function DocumentosList({ clienteId, documentosIniciales }: Props) {
  const [documentos, setDocumentos] = useState(documentosIniciales);
  const [uploading, setUploading] = useState(false);
  const [nombreDoc, setNombreDoc] = useState("");
  const [tipoDoc, setTipoDoc] = useState("comprobante_pago");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("archivo", file);
    formData.append("nombre", nombreDoc || file.name);
    formData.append("tipo", tipoDoc);

    setUploading(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/documentos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const doc = await res.json();
      setDocumentos((prev) => [doc, ...prev]);
      setNombreDoc("");
      toast.success("Documento subido correctamente");
    } catch (err: any) {
      toast.error(err.message || "Error al subir");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      await fetch(`/api/clientes/${clienteId}/documentos?docId=${docId}`, {
        method: "DELETE",
      });
      setDocumentos((prev) => prev.filter((d) => d.id !== docId));
      toast.success("Documento eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  }

  function formatSize(bytes?: number) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  const tipoLabels: Record<string, string> = {
    comprobante_pago: "Comprobante de pago",
    documentacion: "Documentación",
    otro: "Otro",
  };

  return (
    <div>
      {/* Lista */}
      {documentos.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">
          No hay documentos subidos
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {documentos.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
              <span className="text-2xl">
                {doc.mimeType === "application/pdf" ? "📄" : "🖼️"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-600 text-slate-800 truncate">{doc.nombre}</p>
                <p className="text-xs text-slate-400">
                  {tipoLabels[doc.tipo] || doc.tipo} · {formatSize(doc.tamano)} · {formatDate(doc.subidoEn)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/files/${doc.rutaArchivo}`}
                  target="_blank"
                  className="text-xs text-brand-600 hover:text-brand-800 bg-brand-50 px-3 py-1.5 rounded-lg"
                >
                  Ver
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload form */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <p className="text-xs font-600 text-slate-500 uppercase tracking-wide mb-3">Subir nuevo documento</p>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Nombre del documento"
            value={nombreDoc}
            onChange={(e) => setNombreDoc(e.target.value)}
            className="flex-1 min-w-32 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-brand-400 bg-white"
          />
          <select
            value={tipoDoc}
            onChange={(e) => setTipoDoc(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-brand-400 bg-white"
          >
            <option value="comprobante_pago">Comprobante de pago</option>
            <option value="documentacion">Documentación</option>
            <option value="otro">Otro</option>
          </select>
          <label
            className={`px-4 py-2 rounded-lg text-sm font-600 cursor-pointer transition-all ${
              uploading
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-brand-600 text-white hover:bg-brand-700"
            }`}
          >
            {uploading ? "Subiendo..." : "📎 Subir archivo"}
            <input
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
