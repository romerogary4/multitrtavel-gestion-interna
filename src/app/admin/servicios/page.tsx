"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface TipoServicio {
  id: string; nombre: string; icono: string;
  descripcion?: string; precioBase?: string; activo: boolean; orden: number;
}

const ICONOS_SUGERIDOS = ["⭐", "👩‍✈️", "📋", "🛡️", "🧳", "✈️", "🏨", "🚗", "🎫", "💊", "📸", "🍽️", "🎒", "🗺️", "💼", "🎯", "🌍", "🚢", "🏖️", "⛷️"];

export default function TiposServicioPage() {
  const [tipos, setTipos] = useState<TipoServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<TipoServicio | null>(null);
  const [form, setForm] = useState({ nombre: "", icono: "⭐", descripcion: "", precioBase: "" });
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const r = await fetch("/api/tipos-servicio");
      const d = await r.json();
      setTipos(d);
    } catch { toast.error("Error al cargar"); }
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditando(null);
    setForm({ nombre: "", icono: "⭐", descripcion: "", precioBase: "" });
    setShowForm(true);
  }

  function abrirEditar(t: TipoServicio) {
    setEditando(t);
    setForm({ nombre: t.nombre, icono: t.icono, descripcion: t.descripcion || "", precioBase: t.precioBase || "" });
    setShowForm(true);
  }

  async function guardar() {
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    setGuardando(true);
    try {
      const method = editando ? "PATCH" : "POST";
      const body = editando
        ? { id: editando.id, ...form }
        : form;
      const r = await fetch("/api/tipos-servicio", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      if (!r.ok) throw new Error("Error al guardar");
      toast.success(editando ? "Servicio actualizado" : "Servicio creado");
      setShowForm(false);
      cargar();
    } catch { toast.error("Error al guardar"); }
    finally { setGuardando(false); }
  }

  async function toggleActivo(t: TipoServicio) {
    const accion = t.activo ? "desactivar" : "activar";
    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} "${t.nombre}"?`)) return;
    try {
      if (t.activo) {
        const r = await fetch("/api/tipos-servicio", {
          method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id })
        });
        if (!r.ok) throw new Error();
      } else {
        const r = await fetch("/api/tipos-servicio", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: t.id, activo: true })
        });
        if (!r.ok) throw new Error();
      }
      toast.success(`Servicio ${t.activo ? "desactivado" : "activado"}`);
      cargar();
    } catch { toast.error("Error al actualizar"); }
  }

  return (
    <div>
      <div className="page-header animate-fade-up">
        <div>
          <h1 className="page-title" style={{ fontSize: 28 }}>Tipos de servicio especial</h1>
          <p style={{ fontSize: 14, color: "#9ca3af", marginTop: 4, marginLeft: 14 }}>
            Catálogo de servicios disponibles para solicitar en las fichas de cliente
          </p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          ➕ Nuevo tipo
        </button>
      </div>

      {/* Grid de tipos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16, marginTop: 24 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              height: 120, borderRadius: 16, background: "#f4f4f6",
              animation: "pulse 1.5s ease-in-out infinite"
            }} />
          ))
        ) : tipos.map(t => (
          <div key={t.id} style={{
            background: t.activo ? "white" : "#fafafa",
            borderRadius: 16, padding: 20,
            border: t.activo ? "1px solid #ebebeb" : "1px dashed #d1d5db",
            boxShadow: t.activo ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
            display: "flex", flexDirection: "column", gap: 12,
            opacity: t.activo ? 1 : 0.7,
            transition: "all 0.2s"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: t.activo ? "#f8f8f8" : "#f0f0f0",
                border: "1px solid #ebebeb", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 26, flexShrink: 0,
                filter: t.activo ? "none" : "grayscale(60%)"
              }}>
                {t.icono}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: t.activo ? "#0f0f0f" : "#6b7280" }}>
                    {t.nombre}
                  </p>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                    background: t.activo ? "#dcfce7" : "#f3f4f6",
                    color: t.activo ? "#16a34a" : "#9ca3af",
                    border: `1px solid ${t.activo ? "#86efac" : "#e5e7eb"}`
                  }}>
                    {t.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                {t.descripcion && (
                  <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 3, lineHeight: 1.4 }}>
                    {t.descripcion}
                  </p>
                )}
                {t.precioBase && (
                  <span style={{
                    display: "inline-block", marginTop: 6, fontSize: 12, fontWeight: 700,
                    color: t.activo ? "#16a34a" : "#9ca3af",
                    background: t.activo ? "#dcfce7" : "#f3f4f6",
                    padding: "2px 8px", borderRadius: 99
                  }}>
                    Precio base: {formatCurrency(Number(t.precioBase))}
                  </span>
                )}
              </div>
            </div>
            <div style={{
              display: "flex", gap: 8, justifyContent: "flex-end",
              borderTop: "1px solid #f4f4f6", paddingTop: 12
            }}>
              <button onClick={() => abrirEditar(t)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "1px solid #e0e0e8",
                  background: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  color: "#374151", transition: "all 0.15s"
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#cc1111"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#e0e0e8"}>
                ✏️ Editar
              </button>
              <button onClick={() => toggleActivo(t)}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  border: t.activo ? "1px solid #fca5a5" : "1px solid #86efac",
                  background: t.activo ? "#fff5f5" : "#f0fdf4",
                  color: t.activo ? "#cc1111" : "#16a34a"
                }}>
                {t.activo ? "🔴 Desactivar" : "🟢 Activar"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {tipos.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
          <p style={{ fontWeight: 600, fontSize: 16 }}>No hay tipos de servicio</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Crea el primero con el botón de arriba</p>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20
        }}>
          <div style={{
            background: "white", borderRadius: 20, width: "100%", maxWidth: 520,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
          }}>
            <div style={{
              padding: "20px 24px", borderBottom: "1px solid #f0f0f0",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 18 }}>
                {editando ? "Editar tipo de servicio" : "Nuevo tipo de servicio"}
              </h2>
              <button onClick={() => setShowForm(false)}
                style={{
                  width: 30, height: 30, borderRadius: "50%", border: "none",
                  background: "#f0f0f0", cursor: "pointer", fontSize: 14
                }}>✕</button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Icono selector */}
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase",
                  letterSpacing: "0.06em", marginBottom: 8
                }}>Icono</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  {ICONOS_SUGERIDOS.map(ic => (
                    <button key={ic} onClick={() => setForm({ ...form, icono: ic })}
                      style={{
                        width: 40, height: 40, borderRadius: 10, border: "2px solid",
                        borderColor: form.icono === ic ? "#cc1111" : "#ebebeb",
                        background: form.icono === ic ? "#fff5f5" : "white",
                        fontSize: 20, cursor: "pointer", transition: "all 0.15s"
                      }}>
                      {ic}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input value={form.icono} onChange={e => setForm({ ...form, icono: e.target.value })}
                    placeholder="O escribe un emoji..."
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e0e0e8",
                      fontSize: 14, outline: "none", fontFamily: "inherit"
                    }} />
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: "#f8f8f8",
                    border: "1px solid #ebebeb", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 22
                  }}>{form.icono}</div>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase",
                  letterSpacing: "0.06em", marginBottom: 6
                }}>Nombre <span style={{ color: "#cc1111" }}>*</span></p>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Transfer al aeropuerto"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: "1.5px solid #e0e0e8", fontSize: 14, outline: "none",
                    fontFamily: "inherit", boxSizing: "border-box"
                  }} />
              </div>

              {/* Descripción */}
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase",
                  letterSpacing: "0.06em", marginBottom: 6
                }}>Descripción (opcional)</p>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Breve descripción del servicio..."
                  rows={2}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: "1.5px solid #e0e0e8", fontSize: 14, outline: "none",
                    fontFamily: "inherit", resize: "none", boxSizing: "border-box"
                  }} />
              </div>

              {/* Precio base */}
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase",
                  letterSpacing: "0.06em", marginBottom: 6
                }}>Precio base (opcional)</p>
                <input type="number" step="0.01" value={form.precioBase}
                  onChange={e => setForm({ ...form, precioBase: e.target.value })}
                  placeholder="0.00 €"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: "1.5px solid #e0e0e8", fontSize: 14, outline: "none",
                    fontFamily: "inherit", boxSizing: "border-box"
                  }} />
              </div>
            </div>

            <div style={{
              padding: "16px 24px", borderTop: "1px solid #f0f0f0",
              display: "flex", gap: 10
            }}>
              <button onClick={guardar} disabled={guardando}
                style={{
                  flex: 1, padding: "12px", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg,#cc1111,#e53333)",
                  color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  opacity: guardando ? 0.7 : 1
                }}>
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear tipo de servicio"}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{
                  padding: "12px 20px", borderRadius: 10, border: "1.5px solid #e0e0e8",
                  background: "white", fontSize: 14, color: "#666", cursor: "pointer"
                }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}