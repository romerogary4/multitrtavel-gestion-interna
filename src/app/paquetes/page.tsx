"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Paquete { id: string; nombre: string; descripcion?: string; activo: boolean; }

export default function PaquetesPage() {
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [editando, setEditando] = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const r = await fetch("/api/paquetes?activos=false");
    const d = await r.json();
    setPaquetes(d); setLoading(false);
  }

  async function guardar() {
    if (!form.nombre) return toast.error("El nombre es obligatorio");
    const method = editando ? "PATCH" : "POST";
    const url = editando ? `/api/paquetes?id=${editando}` : "/api/paquetes";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (r.ok) { toast.success(editando ? "Paquete actualizado" : "Paquete creado"); setForm({ nombre: "", descripcion: "" }); setEditando(null); cargar(); }
    else toast.error("Error guardando paquete");
  }

  async function toggleActivo(p: Paquete) {
    await fetch(`/api/paquetes?id=${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !p.activo }) });
    cargar();
  }

  function editar(p: Paquete) { setEditando(p.id); setForm({ nombre: p.nombre, descripcion: p.descripcion || "" }); }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Paquetes</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
        {/* Formulario */}
        <div className="card" style={{ padding: 24, alignSelf: "start" }}>
          <h3 style={{
            fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 16, color: "#0f0f0f",
            marginBottom: 20, display: "flex", alignItems: "center", gap: 8
          }}>
            <span style={{ width: 3, height: 18, background: "#cc1111", borderRadius: 4, display: "block" }} />
            {editando ? "Editar paquete" : "Nuevo paquete"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Nombre *
              </label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Paquete Turístico" className="input-field" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Descripción
              </label>
              <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Descripción opcional..." rows={3}
                className="input-field" style={{ resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={guardar} className="btn-primary" style={{ flex: 1 }}>
                {editando ? "✓ Actualizar" : "+ Crear paquete"}
              </button>
              {editando && (
                <button onClick={() => { setEditando(null); setForm({ nombre: "", descripcion: "" }); }}
                  className="btn-secondary">Cancelar</button>
              )}
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f0f0f0" }}>
            <h3 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 15, color: "#0f0f0f" }}>
              Paquetes registrados
            </h3>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Cargando...</div>
          ) : paquetes.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>✈️</p>
              <p>No hay paquetes creados aún</p>
            </div>
          ) : (
            <div>
              {paquetes.map((p, i) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                  borderBottom: i < paquetes.length - 1 ? "1px solid #f9f9f9" : "none"
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: p.activo ? "linear-gradient(135deg,#cc1111,#e52222)" : "#f3f4f6",
                    color: p.activo ? "white" : "#9ca3af",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
                  }}>
                    ✈️
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: p.activo ? "#111" : "#9ca3af", fontSize: 14 }}>{p.nombre}</p>
                    {p.descripcion && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{p.descripcion}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                      background: p.activo ? "#dcfce7" : "#f3f4f6",
                      color: p.activo ? "#16a34a" : "#9ca3af",
                      border: `1px solid ${p.activo ? "#86efac" : "#e5e7eb"}`
                    }}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                    <button onClick={() => editar(p)} className="btn-secondary"
                      style={{ padding: "5px 12px", fontSize: 12 }}>Editar</button>
                    <button onClick={() => toggleActivo(p)} className="btn-secondary"
                      style={{
                        padding: "5px 12px", fontSize: 12,
                        color: p.activo ? "#cc1111" : "#16a34a",
                        borderColor: p.activo ? "#fca5a5" : "#86efac"
                      }}>
                      {p.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
