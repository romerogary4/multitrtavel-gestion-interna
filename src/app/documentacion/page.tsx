"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

interface Historial {
    id: string;
    estadoAnterior: string | null;
    estadoNuevo: string;
    nota: string | null;
    comprobante: string | null;
    creadoEn: string;
    creadoPorUser: { name: string };
}

interface Solicitud {
    id: string;
    titulo: string;
    descripcion: string | null;
    estado: string;
    creadoPor: string;
    creadoEn: string;
    actualizadoEn: string;
    creadoPorUser: { name: string; image: string | null };
    historial: Historial[];
}

const ESTADOS = ["solicitado", "enviado", "entregado", "pagado"];

const ESTADO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    solicitado: { bg: "#fef3c7", color: "#92400e", label: "Solicitado" },
    enviado: { bg: "#dbeafe", color: "#1e40af", label: "Enviado" },
    entregado: { bg: "#dcfce7", color: "#166534", label: "Entregado" },
    pagado: { bg: "#f3e8ff", color: "#6b21a8", label: "Pagado" },
};

function formatFecha(f: string) {
    return new Date(f).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function EstadoBadge({ estado }: { estado: string }) {
    const s = ESTADO_STYLE[estado] || { bg: "#f3f4f6", color: "#374151", label: estado };
    return (
        <span style={{
            background: s.bg, color: s.color, borderRadius: 20,
            padding: "3px 10px", fontSize: 12, fontWeight: 700,
        }}>{s.label}</span>
    );
}

// ─── Modal Cambiar Estado ─────────────────────────────────────────────────────
function ModalCambiarEstado({ solicitud, onClose, onSuccess, esAdmin }: {
    solicitud: Solicitud; onClose: () => void;
    onSuccess: () => void; esAdmin: boolean;
}) {
    const [estado, setEstado] = useState(solicitud.estado);
    const [nota, setNota] = useState("");
    const [comprobante, setComprobante] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    async function guardar() {
        if (estado === solicitud.estado && !nota && !comprobante) {
            toast.error("Selecciona un estado diferente o añade nota/comprobante");
            return;
        }
        setLoading(true);
        const fd = new FormData();
        fd.append("id", solicitud.id);
        fd.append("estado", estado);
        if (nota.trim()) fd.append("nota", nota.trim());
        if (comprobante) fd.append("comprobante", comprobante);
        const r = await fetch("/api/documentacion", { method: "PATCH", body: fd });
        if (r.ok) { toast.success("Estado actualizado ✓"); onSuccess(); }
        else { const e = await r.json(); toast.error(e.error || "Error"); }
        setLoading(false);
    }

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{
                background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480,
                boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
            }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Actualizar estado</h3>
                <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>{solicitud.titulo}</p>

                {/* Estados */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {ESTADOS.map(e => {
                        const s = ESTADO_STYLE[e];
                        const activo = estado === e;
                        return (
                            <button key={e} onClick={() => setEstado(e)} style={{
                                padding: "8px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                                background: activo ? s.bg : "#f9f9f9",
                                color: activo ? s.color : "#6b7280",
                                border: activo ? `2px solid ${s.color}` : "2px solid transparent",
                            }}>{s.label}</button>
                        );
                    })}
                </div>

                {/* Nota */}
                <textarea placeholder="Nota (opcional)..." value={nota} onChange={e => setNota(e.target.value)}
                    rows={3} style={{
                        width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e0e0e8",
                        fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", marginBottom: 12, boxSizing: "border-box",
                    }}
                    onFocus={e => (e.target as HTMLElement).style.borderColor = "#cc1111"}
                    onBlur={e => (e.target as HTMLElement).style.borderColor = "#e0e0e8"} />

                {/* Comprobante */}
                <div style={{ marginBottom: 20 }}>
                    <button onClick={() => fileRef.current?.click()} style={{
                        padding: "8px 14px", borderRadius: 10, border: "1.5px dashed #d1d5db",
                        background: "white", fontSize: 13, color: "#6b7280", cursor: "pointer", fontFamily: "inherit",
                    }}>
                        📎 {comprobante ? comprobante.name : "Adjuntar comprobante (opcional)"}
                    </button>
                    {comprobante && (
                        <button onClick={() => setComprobante(null)} style={{
                            marginLeft: 8, fontSize: 12, color: "#cc1111", background: "none",
                            border: "none", cursor: "pointer", fontFamily: "inherit",
                        }}>✕ Quitar</button>
                    )}
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={e => setComprobante(e.target.files?.[0] || null)} style={{ display: "none" }} />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: "11px 0", borderRadius: 12, border: "1.5px solid #e0e0e8",
                        background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#374151",
                    }}>Cancelar</button>
                    <button onClick={guardar} disabled={loading} style={{
                        flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
                        background: "#cc1111", color: "white", fontSize: 14, fontWeight: 700,
                        cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1,
                    }}>{loading ? "Guardando..." : "✓ Guardar"}</button>
                </div>
            </div>
        </div>
    );
}

// ─── Modal Nueva Solicitud ────────────────────────────────────────────────────
function ModalNuevaSolicitud({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [titulo, setTitulo] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [loading, setLoading] = useState(false);

    async function crear() {
        if (!titulo.trim()) { toast.error("El título es requerido"); return; }
        setLoading(true);
        const r = await fetch("/api/documentacion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo: titulo.trim(), descripcion: descripcion.trim() || null }),
        });
        if (r.ok) { toast.success("Solicitud creada ✓"); onSuccess(); }
        else { const e = await r.json(); toast.error(e.error || "Error"); }
        setLoading(false);
    }

    const inputStyle = {
        width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e0e0e8",
        fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const,
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{
                background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 460,
                boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
            }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Nueva solicitud de documentación</h3>

                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>
                        TÍTULO *
                    </label>
                    <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Pasaporte cliente García"
                        style={inputStyle}
                        onFocus={e => (e.target as HTMLElement).style.borderColor = "#cc1111"}
                        onBlur={e => (e.target as HTMLElement).style.borderColor = "#e0e0e8"} />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>
                        DESCRIPCIÓN (opcional)
                    </label>
                    <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                        placeholder="Detalles adicionales..." rows={3}
                        style={{ ...inputStyle, resize: "vertical" }}
                        onFocus={e => (e.target as HTMLElement).style.borderColor = "#cc1111"}
                        onBlur={e => (e.target as HTMLElement).style.borderColor = "#e0e0e8"} />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: "11px 0", borderRadius: 12, border: "1.5px solid #e0e0e8",
                        background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#374151",
                    }}>Cancelar</button>
                    <button onClick={crear} disabled={loading} style={{
                        flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
                        background: "#cc1111", color: "white", fontSize: 14, fontWeight: 700,
                        cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1,
                    }}>{loading ? "Creando..." : "✓ Crear solicitud"}</button>
                </div>
            </div>
        </div>
    );
}

// ─── Tarjeta Solicitud ────────────────────────────────────────────────────────
function TarjetaSolicitud({ sol, esAdmin, sessionUserId, onRefresh }: {
    sol: Solicitud; esAdmin: boolean; sessionUserId: string; onRefresh: () => void;
}) {
    const [expandido, setExpandido] = useState(false);
    const [modalEstado, setModalEstado] = useState(false);
    const [lightbox, setLightbox] = useState<string | null>(null);

    async function eliminarSolicitud() {
        if (!confirm("¿Eliminar esta solicitud? Esta acción no se puede deshacer.")) return;
        const r = await fetch(`/api/documentacion?tipo=solicitud&id=${sol.id}`, { method: "DELETE" });
        if (r.ok) { toast.success("Solicitud eliminada"); onRefresh(); }
        else toast.error("Error al eliminar");
    }

    async function eliminarComprobante(histId: string) {
        if (!confirm("¿Eliminar este comprobante?")) return;
        const r = await fetch(`/api/documentacion?tipo=comprobante&id=${histId}`, { method: "DELETE" });
        if (r.ok) { toast.success("Comprobante eliminado"); onRefresh(); }
        else toast.error("Error al eliminar");
    }

    const s = ESTADO_STYLE[sol.estado];

    return (
        <>
            {lightbox && (
                <div onClick={() => setLightbox(null)} style={{
                    position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.85)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out",
                }}>
                    <img src={lightbox} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
                </div>
            )}

            {modalEstado && (
                <ModalCambiarEstado solicitud={sol} esAdmin={esAdmin}
                    onClose={() => setModalEstado(false)}
                    onSuccess={() => { setModalEstado(false); onRefresh(); }} />
            )}

            <div style={{
                background: "white", borderRadius: 16, border: "1px solid #f0f0f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden",
                transition: "box-shadow 0.2s",
            }}>
                {/* Header tarjeta */}
                <div style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                    {/* Indicador estado */}
                    <div style={{
                        width: 4, borderRadius: 4, alignSelf: "stretch", flexShrink: 0,
                        background: s?.color || "#d1d5db",
                        minHeight: 40,
                    }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                            <h3 style={{ fontWeight: 700, fontSize: 15, color: "#111", margin: 0 }}>{sol.titulo}</h3>
                            <EstadoBadge estado={sol.estado} />
                        </div>
                        {sol.descripcion && (
                            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>{sol.descripcion}</p>
                        )}
                        <p style={{ fontSize: 11, color: "#9ca3af" }}>
                            Por {sol.creadoPorUser.name} · {formatFecha(sol.creadoEn)}
                        </p>
                    </div>

                    {/* Acciones */}
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button onClick={() => setExpandido(v => !v)} style={{
                            padding: "6px 12px", borderRadius: 8, border: "1.5px solid #e0e0e8",
                            background: "white", fontSize: 12, color: "#374151", cursor: "pointer", fontFamily: "inherit",
                        }}>
                            {expandido ? "▲ Ocultar" : "▼ Historial"}
                        </button>
                        {(esAdmin || sol.creadoPor === sessionUserId) && (
                            <button onClick={() => setModalEstado(true)} style={{
                                padding: "6px 12px", borderRadius: 8, border: "none",
                                background: "#cc1111", color: "white", fontSize: 12, fontWeight: 700,
                                cursor: "pointer", fontFamily: "inherit",
                            }}>
                                ✎ Estado
                            </button>
                        )}
                        {esAdmin && (
                            <button onClick={eliminarSolicitud} style={{
                                padding: "6px 10px", borderRadius: 8, border: "1.5px solid #fca5a5",
                                background: "#fff5f5", color: "#cc1111", fontSize: 12,
                                cursor: "pointer", fontFamily: "inherit",
                            }}>✕</button>
                        )}
                    </div>
                </div>

                {/* Historial expandido */}
                {expandido && (
                    <div style={{ borderTop: "1px solid #f5f5f5", padding: "16px 20px 20px", background: "#fafafa" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                            Historial de cambios
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {sol.historial.map((h, i) => (
                                <div key={h.id} style={{
                                    display: "flex", gap: 12, alignItems: "flex-start",
                                }}>
                                    {/* Línea de tiempo */}
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                                        <div style={{
                                            width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                                            background: ESTADO_STYLE[h.estadoNuevo]?.color || "#d1d5db",
                                            border: "2px solid white", boxShadow: "0 0 0 2px " + (ESTADO_STYLE[h.estadoNuevo]?.color || "#d1d5db") + "33",
                                            marginTop: 3,
                                        }} />
                                        {i < sol.historial.length - 1 && (
                                            <div style={{ width: 1, flex: 1, background: "#e0e0e8", marginTop: 4 }} />
                                        )}
                                    </div>

                                    <div style={{ flex: 1, paddingBottom: i < sol.historial.length - 1 ? 8 : 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                            <EstadoBadge estado={h.estadoNuevo} />
                                            <span style={{ fontSize: 11, color: "#9ca3af" }}>
                                                {h.creadoPorUser.name} · {formatFecha(h.creadoEn)}
                                            </span>
                                        </div>
                                        {h.nota && (
                                            <p style={{ fontSize: 13, color: "#374151", margin: "4px 0" }}>{h.nota}</p>
                                        )}
                                        {h.comprobante && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                                {h.comprobante.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                                                    <img
                                                        src={`/api/files/${h.comprobante}`}
                                                        onClick={() => setLightbox(`/api/files/${h.comprobante}`)}
                                                        style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", cursor: "zoom-in", border: "1px solid #e0e0e8" }}
                                                    />
                                                ) : (
                                                    <a href={`/api/files/${h.comprobante}`} target="_blank" rel="noreferrer"
                                                        style={{ fontSize: 12, color: "#2563eb", background: "#eff6ff", padding: "4px 10px", borderRadius: 8, textDecoration: "none" }}>
                                                        📄 Ver PDF
                                                    </a>
                                                )}
                                                {esAdmin && (
                                                    <button onClick={() => eliminarComprobante(h.id)} style={{
                                                        fontSize: 11, color: "#cc1111", background: "#fff5f5",
                                                        border: "1px solid #fca5a5", borderRadius: 6, padding: "3px 8px",
                                                        cursor: "pointer", fontFamily: "inherit",
                                                    }}>✕ Eliminar</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function DocumentacionPage() {
    const { data: session } = useSession();
    const esAdmin = (session?.user as any)?.rol === "administrador";
    const sessionUserId = session?.user?.id || "";
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState("todos");
    const [modalNueva, setModalNueva] = useState(false);

    async function cargar() {
        setLoading(true);
        const r = await fetch(`/api/documentacion?estado=${filtro}`);
        if (r.ok) setSolicitudes(await r.json());
        setLoading(false);
    }

    useEffect(() => { cargar(); }, [filtro]);

    const filtros = [
        { value: "todos", label: "Todos" },
        { value: "solicitado", label: "Solicitados" },
        { value: "enviado", label: "Enviados" },
        { value: "entregado", label: "Entregados" },
        { value: "pagado", label: "Pagados" },
    ];

    return (
        <div>
            {modalNueva && (
                <ModalNuevaSolicitud
                    onClose={() => setModalNueva(false)}
                    onSuccess={() => { setModalNueva(false); cargar(); }}
                />
            )}

            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">Documentación</h1>
                <button onClick={() => setModalNueva(true)} className="btn-primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    ➕ Nueva solicitud
                </button>
            </div>

            {/* Filtros de estado */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {filtros.map(f => (
                    <button key={f.value} onClick={() => setFiltro(f.value)} style={{
                        padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                        background: filtro === f.value ? "#cc1111" : "white",
                        color: filtro === f.value ? "white" : "#6b7280",
                        border: filtro === f.value ? "none" : "1.5px solid #e0e0e8",
                    }}>
                        {f.value !== "todos" && <span style={{ marginRight: 4 }}>
                            {f.value === "solicitado" ? "🟡" : f.value === "enviado" ? "🔵" : f.value === "entregado" ? "🟢" : "🟣"}
                        </span>}
                        {f.label}
                    </button>
                ))}
                <span style={{ fontSize: 13, color: "#9ca3af", alignSelf: "center", marginLeft: 4 }}>
                    {solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""}
                </span>
            </div>

            {/* Lista */}
            {loading ? (
                <div style={{ padding: 64, textAlign: "center", color: "#9ca3af" }}>Cargando...</div>
            ) : solicitudes.length === 0 ? (
                <div style={{
                    background: "white", borderRadius: 16, border: "1px solid #f0f0f0",
                    padding: 64, textAlign: "center", color: "#9ca3af",
                }}>
                    <p style={{ fontSize: 36, marginBottom: 12 }}>📄</p>
                    <p style={{ fontWeight: 600 }}>No hay solicitudes</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>Crea una nueva solicitud para comenzar</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {solicitudes.map(sol => (
                        <TarjetaSolicitud key={sol.id} sol={sol} esAdmin={esAdmin} sessionUserId={sessionUserId} onRefresh={cargar} />
                    ))}
                </div>
            )}
        </div>
    );
}