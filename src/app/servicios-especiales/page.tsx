"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { formatCurrency, formatDateTime, TIPO_SERVICIO_LABELS } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface Servicio {
  id: string; tipoServicio: string; descripcionServicio?: string;
  monto?: string; moneda: string; justificacion: string; estado: string;
  motivoRechazo?: string; comprobantes: string[]; creadoEn: string; revisadoEn?: string;
  cliente: { id: string; nombre: string; apellidos: string };
  agente: { name: string }; admin?: { name: string };
}

const ESTADO_COLORS: Record<string, { bg: string, color: string, label: string }> = {
  pendiente: { bg: "#fef3c7", color: "#92400e", label: "Pendiente" },
  aprobada: { bg: "#dcfce7", color: "#166534", label: "Aprobada" },
  rechazada: { bg: "#fee2e2", color: "#991b1b", label: "Rechazada" },
};

export default function ServiciosPage() {
  const { data: session } = useSession();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("pendiente");
  const [rechazarId, setRechazarId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [viendoImagen, setViendoImagen] = useState<string | null>(null);
  const esAdmin = (session?.user as any)?.rol === "administrador";

  async function cargar() {
    setLoading(true);
    try {
      const r = await fetch(`/api/servicios?estado=${filtro}`);
      if (!r.ok) { console.error("Error cargando servicios:", r.status); setLoading(false); return; }
      const d = await r.json();
      setServicios(Array.isArray(d) ? d : []);
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, [filtro]);

  async function aprobar(id: string) {
    if (!confirm("¿Aprobar esta solicitud?")) return;
    const r = await fetch(`/api/servicios?id=${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "aprobada" }),
    });
    if (r.ok) { toast.success("Servicio aprobado ✓"); cargar(); }
    else toast.error("Error al aprobar");
  }

  async function rechazar(id: string) {
    if (!motivoRechazo.trim()) { toast.error("Indica el motivo del rechazo"); return; }
    const r = await fetch(`/api/servicios?id=${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "rechazada", motivoRechazo }),
    });
    if (r.ok) { toast.success("Solicitud rechazada"); setRechazarId(null); setMotivoRechazo(""); cargar(); }
  }

  async function subirComprobante(id: string, file: File) {
    const fd = new FormData();
    fd.append("comprobante", file);
    const r = await fetch(`/api/servicios/comprobante?id=${id}`, { method: "POST", body: fd });
    if (r.ok) { toast.success("Comprobante adjuntado"); cargar(); }
    else toast.error("Error al subir comprobante");
  }

  function getFileUrl(ruta: string) {
    if (ruta.startsWith("http")) return ruta;
    return `/api/files/${ruta}`;
  }

  function isPdf(ruta: string) { return ruta.toLowerCase().endsWith(".pdf"); }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Servicios especiales</h1>

      </div>

      {/* Filtros de estado */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { v: "pendiente", label: "⏳ Pendientes" },
          { v: "aprobada", label: "✅ Aprobadas" },
          { v: "rechazada", label: "❌ Rechazadas" },
          { v: "", label: "📋 Todas" },
        ].map(f => (
          <button key={f.v} onClick={() => setFiltro(f.v)}
            style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
              background: filtro === f.v ? "#cc1111" : "white",
              color: filtro === f.v ? "white" : "#374151",
              border: filtro === f.v ? "2px solid #cc1111" : "2px solid #e0e0e8"
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 64, textAlign: "center", color: "#9ca3af" }}>Cargando...</div>
      ) : servicios.length === 0 ? (
        <div className="card" style={{ padding: 64, textAlign: "center", color: "#9ca3af" }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>⭐</p>
          <p>No hay solicitudes {filtro ? `en estado "${ESTADO_COLORS[filtro]?.label}"` : ""}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {servicios.map(s => {
            const est = ESTADO_COLORS[s.estado] || ESTADO_COLORS.pendiente;
            return (
              <div key={s.id} className="card" style={{ padding: 24 }}>
                {/* Cabecera */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>
                        {s.tipoServicio === "azafata" ? "👩‍✈️"
                          : s.tipoServicio === "seguro_viaje" ? "🛡️"
                            : s.tipoServicio === "maleta_extra" ? "🧳"
                              : s.tipoServicio === "documentacion_notaria" ? "📋" : "⭐"}
                      </span>
                      <h3 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 17, color: "#0f0f0f" }}>
                        {(TIPO_SERVICIO_LABELS as any)[s.tipoServicio] || s.tipoServicio}
                        {s.descripcionServicio && ` — ${s.descripcionServicio}`}
                      </h3>
                      <span style={{
                        padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                        background: est.bg, color: est.color
                      }}>
                        {est.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "#9ca3af" }}>
                      Cliente: <Link href={`/clientes/${s.cliente.id}`}
                        style={{ color: "#cc1111", textDecoration: "none", fontWeight: 600 }}>
                        {s.cliente.nombre} {s.cliente.apellidos}
                      </Link>
                      {" · "}Agente: {s.agente.name}
                      {" · "}{new Date(s.creadoEn).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  {s.monto && (
                    <p style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 20, color: "#cc1111" }}>
                      {formatCurrency(s.monto)} {s.moneda}
                    </p>
                  )}
                </div>

                {/* Justificación */}
                <div style={{ padding: "12px 16px", background: "#f9f9f9", borderRadius: 12, marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", marginBottom: 4 }}>JUSTIFICACIÓN</p>
                  <p style={{ fontSize: 14, color: "#374151" }}>{s.justificacion}</p>
                </div>

                {/* Comprobantes — diseño de galería */}
                {s.comprobantes.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", marginBottom: 10 }}>
                      COMPROBANTES ({s.comprobantes.length})
                    </p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {s.comprobantes.map((comp, ci) => {
                        const url = getFileUrl(comp);
                        const pdf = isPdf(comp);
                        return (
                          <div key={ci} onClick={() => pdf ? window.open(url, "_blank") : setViendoImagen(url)}
                            style={{
                              width: 100, height: 100, borderRadius: 14, overflow: "hidden",
                              border: "2px solid #f0f0f0", cursor: "pointer", position: "relative",
                              background: pdf ? "#f8f8f8" : "#000",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.2s", flexShrink: 0
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.borderColor = "#cc1111";
                              (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.borderColor = "#f0f0f0";
                              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                            }}>
                            {pdf ? (
                              <div style={{ textAlign: "center" }}>
                                <p style={{ fontSize: 28 }}>📄</p>
                                <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>PDF</p>
                              </div>
                            ) : (
                              <img src={url} alt={`Comprobante ${ci + 1}`}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            )}
                            <div style={{
                              position: "absolute", inset: 0, background: "rgba(0,0,0,0)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "white", fontSize: 20, transition: "background 0.2s"
                            }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.3)"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0)"}>
                              🔍
                            </div>
                          </div>
                        );
                      })}
                      {/* Botón añadir comprobante */}
                      <label style={{
                        width: 100, height: 100, borderRadius: 14,
                        border: "2px dashed #e0e0e8", display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", cursor: "pointer",
                        transition: "all 0.15s", flexShrink: 0
                      }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#cc1111"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#e0e0e8"}>
                        <p style={{ fontSize: 24 }}>+</p>
                        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Añadir</p>
                        <input type="file" accept=".pdf,image/*" style={{ display: "none" }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) subirComprobante(s.id, f); }} />
                      </label>
                    </div>
                  </div>
                )}

                {/* Sin comprobantes - añadir */}
                {s.comprobantes.length === 0 && (
                  <label style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                    background: "#f9f9f9", borderRadius: 12, cursor: "pointer", marginBottom: 16,
                    border: "2px dashed #e0e0e8", transition: "border-color 0.15s"
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#cc1111"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#e0e0e8"}>
                    <span style={{ fontSize: 20 }}>📎</span>
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>Adjuntar comprobante (PDF o imagen)</span>
                    <input type="file" accept=".pdf,image/*" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) subirComprobante(s.id, f); }} />
                  </label>
                )}

                {/* Motivo rechazo */}
                {s.estado === "rechazada" && s.motivoRechazo && (
                  <div style={{
                    padding: "12px 16px", background: "#fff0f0",
                    borderRadius: 12, border: "1px solid #fca5a5", marginBottom: 16
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#cc1111", marginBottom: 4 }}>MOTIVO DE RECHAZO</p>
                    <p style={{ fontSize: 14, color: "#374151" }}>{s.motivoRechazo}</p>
                  </div>
                )}

                {/* Acciones admin */}
                {esAdmin && s.estado === "pendiente" && (
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button onClick={() => aprobar(s.id)} className="btn-primary"
                      style={{ fontSize: 13, padding: "8px 20px" }}>
                      ✓ Aprobar
                    </button>
                    <button onClick={() => setRechazarId(s.id)} className="btn-secondary"
                      style={{ fontSize: 13, padding: "8px 20px", color: "#cc1111", borderColor: "#fca5a5" }}>
                      ✕ Rechazar
                    </button>
                  </div>
                )}

                {/* Modal rechazo */}
                {rechazarId === s.id && (
                  <div style={{
                    marginTop: 12, padding: "16px", background: "#fff0f0",
                    borderRadius: 14, border: "1px solid #fca5a5"
                  }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#cc1111", marginBottom: 8 }}>
                      Motivo del rechazo
                    </p>
                    <textarea value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)}
                      placeholder="Explica por qué se rechaza..." rows={2}
                      className="input-field" style={{ marginBottom: 10, resize: "none" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => rechazar(s.id)} className="btn-primary"
                        style={{ fontSize: 13, padding: "7px 16px" }}>
                        Confirmar rechazo
                      </button>
                      <button onClick={() => { setRechazarId(null); setMotivoRechazo(""); }}
                        className="btn-secondary" style={{ fontSize: 13, padding: "7px 16px" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox de imagen */}
      {viendoImagen && (
        <div onClick={() => setViendoImagen(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh", position: "relative" }}>
            <button onClick={() => setViendoImagen(null)}
              style={{
                position: "absolute", top: -40, right: 0, background: "none", border: "none",
                color: "white", fontSize: 28, cursor: "pointer"
              }}>✕</button>
            {viendoImagen.endsWith(".pdf") ? null : (
              <img src={viendoImagen} style={{
                maxWidth: "85vw", maxHeight: "85vh",
                borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.5)"
              }} />
            )}
            <a href={viendoImagen} target="_blank" rel="noreferrer"
              style={{
                position: "absolute", bottom: -40, left: "50%", transform: "translateX(-50%)",
                fontSize: 13, color: "rgba(255,255,255,0.7)", textDecoration: "none"
              }}>
              ↗ Abrir en nueva pestaña
            </a>
          </div>
        </div>
      )}
    </div>
  );
}