"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";

interface Tarea {
    id: string;
    titulo: string;
    descripcion?: string;
    completada: boolean;
    prioridad: "baja" | "media" | "alta";
    fechaLimite?: string;
    recordatorio?: string;
    creadoPor: string;
    asignadoA?: string;
    completadaEn?: string;
    creadoEn: string;
    creadoPorUser?: { name: string; image?: string };
    asignadoAUser?: { name: string; image?: string };
}

interface Agente {
    id: string;
    name: string;
}

const PRIORIDAD_COLOR = { alta: "#cc1111", media: "#d97706", baja: "#16a34a" };
const PRIORIDAD_BG = { alta: "#fef2f2", media: "#fffbeb", baja: "#f0fdf4" };
const PRIORIDAD_LABEL = { alta: "Alta", media: "Media", baja: "Baja" };

function formatFecha(dateStr?: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(d);
    fecha.setHours(0, 0, 0, 0);
    const diff = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
    if (diff < 0) return `Venció hace ${Math.abs(diff)}d`;
    if (diff === 0) return "Hoy";
    if (diff === 1) return "Mañana";
    if (diff <= 7) return `En ${diff} días`;
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function esVencida(t: Tarea): boolean {
    return !t.completada && !!t.fechaLimite && new Date(t.fechaLimite) < new Date();
}

function esPróxima(t: Tarea): boolean {
    if (!t.fechaLimite || t.completada) return false;
    const diff = (new Date(t.fechaLimite).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 2;
}

// Formatear datetime-local para inputs
function toInputDatetime(dateStr?: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toInputDate(dateStr?: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function TodoPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { data: session } = useSession();
    const esAdmin = (session?.user as any)?.rol === "administrador";

    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [pendientes, setPendientes] = useState(0);
    const [vencidas, setVencidas] = useState(0);
    const [loading, setLoading] = useState(true);
    const [agentes, setAgentes] = useState<Agente[]>([]);

    // Formulario nueva tarea
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [form, setForm] = useState({
        titulo: "", descripcion: "", prioridad: "media",
        fechaLimite: "", recordatorio: "", asignadoA: "",
    });

    // Filtros
    const [filtro, setFiltro] = useState<"todas" | "pendientes" | "completadas">("pendientes");

    async function cargar() {
        try {
            const r = await fetch("/api/tareas");
            if (!r.ok) return;
            const d = await r.json();
            setTareas(d.tareas || []);
            setPendientes(d.pendientes || 0);
            setVencidas(d.vencidas || 0);
        } catch { }
        setLoading(false);
    }

    async function cargarAgentes() {
        if (!esAdmin) return;
        try {
            const r = await fetch("/api/admin/agentes");
            if (!r.ok) return;
            const d = await r.json();
            setAgentes((d.agentes || d || []).map((a: { id: string; name: string;[key: string]: any }) => ({ id: a.id, name: a.name })));
        } catch { }
    }

    useEffect(() => {
        if (open) { cargar(); cargarAgentes(); }
    }, [open]);

    function resetForm() {
        setForm({ titulo: "", descripcion: "", prioridad: "media", fechaLimite: "", recordatorio: "", asignadoA: "" });
        setEditandoId(null);
        setMostrarForm(false);
    }

    function empezarEditar(t: Tarea) {
        setForm({
            titulo: t.titulo,
            descripcion: t.descripcion || "",
            prioridad: t.prioridad,
            fechaLimite: toInputDate(t.fechaLimite),
            recordatorio: toInputDatetime(t.recordatorio),
            asignadoA: t.asignadoA || "",
        });
        setEditandoId(t.id);
        setMostrarForm(true);
    }

    async function guardar() {
        if (!form.titulo.trim()) return;
        const body = {
            titulo: form.titulo,
            descripcion: form.descripcion || null,
            prioridad: form.prioridad,
            fechaLimite: form.fechaLimite ? new Date(form.fechaLimite + "T23:59:00").toISOString() : null,
            recordatorio: form.recordatorio ? new Date(form.recordatorio).toISOString() : null,
            asignadoA: form.asignadoA || null,
        };

        if (editandoId) {
            await fetch(`/api/tareas?id=${editandoId}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        } else {
            await fetch("/api/tareas", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        }
        resetForm();
        cargar();
    }

    async function toggleCompletar(t: Tarea) {
        await fetch(`/api/tareas?id=${t.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completada: !t.completada }),
        });
        cargar();
    }

    async function eliminar(id: string) {
        if (!confirm("¿Eliminar esta tarea?")) return;
        await fetch(`/api/tareas?id=${id}`, { method: "DELETE" });
        cargar();
    }

    const tareasFiltradas = tareas.filter((t: Tarea) => {
        if (filtro === "pendientes") return !t.completada;
        if (filtro === "completadas") return t.completada;
        return true;
    });

    if (!open) return null;

    return (
        <>
            {/* Overlay */}
            <div onClick={onClose} style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
                zIndex: 1100, backdropFilter: "blur(2px)",
            }} />

            {/* Panel */}
            <div style={{
                position: "fixed", right: 0, top: 0, bottom: 0, width: 420,
                background: "white", zIndex: 1101,
                boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
                display: "flex", flexDirection: "column",
                animation: "slideIn 0.2s ease",
            }}>
                <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

                {/* Header */}
                <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>📋 Mis tareas</h2>
                            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                                {pendientes} pendiente{pendientes !== 1 ? "s" : ""}
                                {vencidas > 0 && <span style={{ color: "#cc1111", fontWeight: 700 }}> · {vencidas} vencida{vencidas !== 1 ? "s" : ""}</span>}
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setMostrarForm(true); setEditandoId(null); setForm({ titulo: "", descripcion: "", prioridad: "media", fechaLimite: "", recordatorio: "", asignadoA: "" }); }}
                                style={{ padding: "8px 14px", borderRadius: 10, background: "#cc1111", color: "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                                + Nueva
                            </button>
                            <button onClick={onClose} style={{ padding: 8, borderRadius: 10, background: "#f5f5f5", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, color: "#6b7280" }}>✕</button>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div style={{ display: "flex", gap: 6 }}>
                        {(["pendientes", "todas", "completadas"] as const).map(f => (
                            <button key={f} onClick={() => setFiltro(f)} style={{
                                padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                                fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
                                background: filtro === f ? "#111" : "#f5f5f5",
                                color: filtro === f ? "white" : "#6b7280", border: "none",
                            }}>
                                {f === "pendientes" ? "Pendientes" : f === "todas" ? "Todas" : "Completadas"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Formulario nueva/editar tarea */}
                {mostrarForm && (
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 10 }}>
                            {editandoId ? "✏️ Editar tarea" : "✨ Nueva tarea"}
                        </p>
                        <input
                            value={form.titulo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: typeof form) => ({ ...p, titulo: e.target.value }))}
                            placeholder="Título de la tarea *" autoFocus
                            onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && guardar()}
                            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e0e0e8", fontSize: 13, fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box", outline: "none" }}
                        />
                        <textarea
                            value={form.descripcion} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((p: typeof form) => ({ ...p, descripcion: e.target.value }))}
                            placeholder="Descripción (opcional)" rows={2}
                            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e0e0e8", fontSize: 13, fontFamily: "inherit", marginBottom: 8, resize: "none", boxSizing: "border-box", outline: "none" }}
                        />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Prioridad</label>
                                <select value={form.prioridad} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((p: typeof form) => ({ ...p, prioridad: e.target.value }))}
                                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1.5px solid #e0e0e8", fontSize: 13, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
                                    <option value="baja">🟢 Baja</option>
                                    <option value="media">🟡 Media</option>
                                    <option value="alta">🔴 Alta</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Fecha límite</label>
                                <input type="date" value={form.fechaLimite} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: typeof form) => ({ ...p, fechaLimite: e.target.value }))}
                                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1.5px solid #e0e0e8", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                            </div>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>⏰ Recordatorio (fecha y hora)</label>
                            <input type="datetime-local" value={form.recordatorio} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: typeof form) => ({ ...p, recordatorio: e.target.value }))}
                                style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1.5px solid #e0e0e8", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        {esAdmin && agentes.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Asignar a agente</label>
                                <select value={form.asignadoA} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((p: typeof form) => ({ ...p, asignadoA: e.target.value }))}
                                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1.5px solid #e0e0e8", fontSize: 13, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
                                    <option value="">Solo para mí</option>
                                    {agentes.map((a: Agente) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={guardar} style={{ flex: 1, padding: "9px", borderRadius: 10, background: "#cc1111", color: "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                                {editandoId ? "Guardar cambios" : "Crear tarea"}
                            </button>
                            <button onClick={resetForm} style={{ padding: "9px 14px", borderRadius: 10, background: "#f5f5f5", color: "#6b7280", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Lista de tareas */}
                <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                    {loading ? (
                        <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Cargando...</div>
                    ) : tareasFiltradas.length === 0 ? (
                        <div style={{ padding: "40px 20px", textAlign: "center" }}>
                            <p style={{ fontSize: 32, marginBottom: 8 }}>✅</p>
                            <p style={{ fontSize: 13, color: "#9ca3af" }}>
                                {filtro === "pendientes" ? "No hay tareas pendientes" : "Sin tareas"}
                            </p>
                        </div>
                    ) : (
                        tareasFiltradas.map((t: Tarea) => (
                            <div key={t.id} style={{
                                padding: "12px 20px",
                                borderBottom: "1px solid #f9f9f9",
                                background: t.completada ? "#fafafa" : esVencida(t) ? "#fff5f5" : "white",
                                transition: "background 0.15s",
                            }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                    {/* Checkbox */}
                                    <button onClick={() => toggleCompletar(t)} style={{
                                        width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                                        border: t.completada ? "none" : `2px solid ${PRIORIDAD_COLOR[t.prioridad]}`,
                                        background: t.completada ? PRIORIDAD_COLOR[t.prioridad] : "white",
                                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 13, transition: "all 0.15s",
                                    }}>
                                        {t.completada && <span style={{ color: "white", fontSize: 12 }}>✓</span>}
                                    </button>

                                    {/* Contenido */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontSize: 14, fontWeight: t.completada ? 400 : 600, color: t.completada ? "#9ca3af" : "#111",
                                            textDecoration: t.completada ? "line-through" : "none", lineHeight: 1.3,
                                        }}>{t.titulo}</p>

                                        {t.descripcion && !t.completada && (
                                            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 3, lineHeight: 1.4 }}>{t.descripcion}</p>
                                        )}

                                        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                                            {/* Prioridad */}
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                                                background: PRIORIDAD_BG[t.prioridad], color: PRIORIDAD_COLOR[t.prioridad],
                                            }}>{PRIORIDAD_LABEL[t.prioridad]}</span>

                                            {/* Fecha límite */}
                                            {t.fechaLimite && !t.completada && (
                                                <span style={{
                                                    fontSize: 11, color: esVencida(t) ? "#cc1111" : esPróxima(t) ? "#d97706" : "#6b7280",
                                                    fontWeight: esVencida(t) || esPróxima(t) ? 700 : 400,
                                                }}>
                                                    📅 {formatFecha(t.fechaLimite)}
                                                </span>
                                            )}

                                            {/* Recordatorio */}
                                            {t.recordatorio && !t.completada && (
                                                <span style={{ fontSize: 11, color: "#7c3aed" }}>⏰ {formatFecha(t.recordatorio)}</span>
                                            )}

                                            {/* Asignado */}
                                            {t.asignadoA && t.asignadoA !== session?.user?.id && (
                                                <span style={{ fontSize: 11, color: "#2563eb" }}>
                                                    → {(t as any).asignadoAUser?.name || "Asignado"}
                                                </span>
                                            )}
                                            {t.asignadoA === session?.user?.id && t.creadoPor !== session?.user?.id && (
                                                <span style={{ fontSize: 11, color: "#2563eb" }}>
                                                    ← {(t as any).creadoPorUser?.name || "Admin"}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                        {!t.completada && (
                                            <button onClick={() => empezarEditar(t)} style={{
                                                padding: "4px 8px", borderRadius: 7, background: "#f5f5f5",
                                                border: "none", cursor: "pointer", fontSize: 13, color: "#6b7280",
                                            }}>✏️</button>
                                        )}
                                        <button onClick={() => eliminar(t.id)} style={{
                                            padding: "4px 8px", borderRadius: 7, background: "#fff0f0",
                                            border: "none", cursor: "pointer", fontSize: 13, color: "#cc1111",
                                        }}>🗑</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}

// Badge de tareas pendientes para el sidebar
export function useTareasBadge() {
    const [pendientes, setPendientes] = useState(0);
    const [vencidas, setVencidas] = useState(0);

    async function cargar() {
        try {
            const r = await fetch("/api/tareas");
            if (!r.ok) return;
            const d = await r.json();
            setPendientes(d.pendientes || 0);
            setVencidas(d.vencidas || 0);
            // Verificar recordatorios al mismo tiempo
            fetch("/api/tareas?tipo=recordatorios").catch(() => { });
        } catch { }
    }

    useEffect(() => {
        cargar();
        const interval = setInterval(cargar, 60000); // cada minuto
        return () => clearInterval(interval);
    }, []);

    return { pendientes, vencidas };
}