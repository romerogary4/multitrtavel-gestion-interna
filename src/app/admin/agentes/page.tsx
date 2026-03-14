"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Avatar, AvatarUpload } from "@/components/ui/Avatar";

interface Agente { id: string; name: string; email: string; rol: string; activo: boolean; createdAt: string; image?: string | null; }

// ─── Modal Cambiar Contraseña ─────────────────────────────────────────────────
function ModalCambiarPassword({ agente, onClose }: { agente: Agente; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);

  async function guardar() {
    if (password.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    if (password !== confirmar) { toast.error("Las contraseñas no coinciden"); return; }
    setLoading(true);
    const r = await fetch(`/api/admin/agentes?id=${agente.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (r.ok) { toast.success("Contraseña actualizada ✓"); onClose(); }
    else { const d = await r.json(); toast.error(d.error || "Error"); }
    setLoading(false);
  }

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e0e0e8",
    fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420,
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
      }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Cambiar contraseña</h3>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>{agente.name} · {agente.email}</p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>
            NUEVA CONTRASEÑA
          </label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres" style={inputStyle}
            onFocus={e => (e.target as HTMLElement).style.borderColor = "#cc1111"}
            onBlur={e => (e.target as HTMLElement).style.borderColor = "#e0e0e8"} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>
            CONFIRMAR CONTRASEÑA
          </label>
          <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
            placeholder="Repite la contraseña" style={inputStyle}
            onFocus={e => (e.target as HTMLElement).style.borderColor = "#cc1111"}
            onBlur={e => (e.target as HTMLElement).style.borderColor = "#e0e0e8"} />
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

export default function AgentesPage() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", rol: "agente" });
  const [creando, setCreando] = useState(false);
  const [modalPassword, setModalPassword] = useState<Agente | null>(null);

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

  async function cambiarRol(a: Agente, nuevoRol: string) {
    if (nuevoRol === a.rol) return;
    await fetch(`/api/admin/agentes?id=${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rol: nuevoRol }) });
    const rolLabels: Record<string, string> = { administrador: "Admin", agente_senior: "Senior", agente_doc: "Senior Doc", agente_clientes: "Senior Clientes", agente: "Agente" };
    toast.success(`Rol cambiado a ${rolLabels[nuevoRol] || nuevoRol}`);
    cargar();
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
      {/* Modal cambiar contraseña */}
      {modalPassword && (
        <ModalCambiarPassword agente={modalPassword} onClose={() => setModalPassword(null)} />
      )}
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
                <option value="agente_doc">Senior Documentación</option>
                <option value="agente_clientes">Senior Clientes</option>
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
                    <select value={a.rol} onChange={e => cambiarRol(a, e.target.value)}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 99,
                        background: a.rol === "administrador" ? "#fef3c7" : a.rol === "agente_senior" ? "#dcfce7" : a.rol === "agente_doc" ? "#eff6ff" : a.rol === "agente_clientes" ? "#fdf4ff" : "#f0f0ff",
                        color: a.rol === "administrador" ? "#92400e" : a.rol === "agente_senior" ? "#166534" : a.rol === "agente_doc" ? "#1d4ed8" : a.rol === "agente_clientes" ? "#7e22ce" : "#4338ca",
                        border: `1px solid ${a.rol === "administrador" ? "#fde68a" : a.rol === "agente_senior" ? "#86efac" : a.rol === "agente_doc" ? "#bfdbfe" : a.rol === "agente_clientes" ? "#e9d5ff" : "#c7d2fe"}`,
                        cursor: "pointer", fontFamily: "inherit", outline: "none",
                      }}>
                      <option value="agente">Agente</option>
                      <option value="agente_senior">Senior</option>
                      <option value="agente_doc">Senior Doc</option>
                      <option value="agente_clientes">Senior Clientes</option>
                      <option value="administrador">Admin</option>
                    </select>
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
                    <button onClick={() => setModalPassword(a)}
                      style={{
                        padding: "5px 10px", fontSize: 12, borderRadius: 8,
                        border: "1.5px solid #e0e0e8", background: "white",
                        color: "#6b7280", cursor: "pointer", fontFamily: "inherit",
                      }}
                      title="Cambiar contraseña">
                      🔑
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