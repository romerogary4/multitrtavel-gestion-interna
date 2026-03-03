"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Avatar, AvatarUpload } from "@/components/ui/Avatar";

interface Agente { id: string; name: string; email: string; rol: string; activo: boolean; createdAt: string; image?: string | null; }

export default function AgentesPage() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", rol: "agente" });
  const [creando, setCreando] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const r = await fetch("/api/admin/agentes");
    const d = await r.json();
    setAgentes(d); setLoading(false);
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    const r = await fetch("/api/admin/agentes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (r.ok) { toast.success("Usuario creado correctamente"); setForm({ name: "", email: "", password: "", rol: "agente" }); cargar(); }
    else { const d = await r.json(); toast.error(d.error || "Error creando usuario"); }
    setCreando(false);
  }

  async function toggleActivo(a: Agente) {
    const accion = a.activo ? "desactivar" : "activar";
    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} a ${a.name}?`)) return;
    await fetch(`/api/admin/agentes?id=${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !a.activo }) });
    toast.success(a.activo ? "Usuario desactivado" : "Usuario activado");
    cargar();
  }

  function updateAvatar(id: string, url: string) {
    // Update local state immediately for instant feedback
    setAgentes(prev => prev.map(a => a.id === id ? { ...a, image: url + "?t=" + Date.now() } : a));
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Agentes</h1>
        <p style={{ fontSize: 14, color: "#9ca3af", marginLeft: 14 }}>
          {agentes.filter(a => a.activo).length} activos · {agentes.length} total
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24 }}>
        {/* Formulario */}
        <div className="card" style={{ padding: 24, alignSelf: "start" }}>
          <h3 style={{
            fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 18, color: "#0f0f0f",
            marginBottom: 20, display: "flex", alignItems: "center", gap: 8
          }}>
            <span style={{ width: 3, height: 20, background: "#cc1111", borderRadius: 4, display: "block" }} />
            Crear usuario
          </h3>
          <form onSubmit={crear} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Nombre completo *", key: "name", type: "text", placeholder: "Nombre Apellido" },
              { label: "Correo electrónico *", key: "email", type: "email", placeholder: "correo@multitravel.es" },
              { label: "Contraseña *", key: "password", type: "password", placeholder: "Mínimo 8 caracteres" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} required
                  value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="input-field" />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Rol</label>
              <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
                className="input-field" style={{ cursor: "pointer" }}>
                <option value="agente">Agente</option>
                <option value="agente_senior">Agente Senior</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
            <button type="submit" disabled={creando} className="btn-primary" style={{ marginTop: 4 }}>
              {creando ? "Creando..." : "+ Crear usuario"}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f0f0f0" }}>
            <h3 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 16, color: "#0f0f0f" }}>
              Usuarios del sistema
            </h3>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Cargando...</div>
          ) : (
            <div>
              {agentes.map((a, i) => (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                  borderBottom: i < agentes.length - 1 ? "1px solid #f9f9f9" : "none",
                  opacity: a.activo ? 1 : 0.6
                }}>
                  {/* Avatar con upload */}
                  <AvatarUpload agentId={a.id} name={a.name} image={a.image}
                    onUploaded={url => updateAvatar(a.id, url)} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{a.name}</p>
                    <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{a.email}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                      background: a.rol === "administrador" ? "#fef3c7" : a.rol === "agente_senior" ? "#dcfce7" : "#f0f0ff",
                      color: a.rol === "administrador" ? "#92400e" : a.rol === "agente_senior" ? "#166534" : "#4338ca",
                      border: `1px solid ${a.rol === "administrador" ? "#fde68a" : a.rol === "agente_senior" ? "#86efac" : "#c7d2fe"}`
                    }}>
                      {a.rol === "administrador" ? "Admin" : a.rol === "agente_senior" ? "Senior" : "Agente"}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                      background: a.activo ? "#dcfce7" : "#f3f4f6",
                      color: a.activo ? "#16a34a" : "#9ca3af",
                      border: `1px solid ${a.activo ? "#86efac" : "#e5e7eb"}`
                    }}>
                      {a.activo ? "Activo" : "Inactivo"}
                    </span>
                    <button onClick={() => toggleActivo(a)} className="btn-secondary"
                      style={{
                        padding: "5px 12px", fontSize: 12,
                        color: a.activo ? "#cc1111" : "#16a34a",
                        borderColor: a.activo ? "#fca5a5" : "#86efac"
                      }}>
                      {a.activo ? "Desactivar" : "Activar"}
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