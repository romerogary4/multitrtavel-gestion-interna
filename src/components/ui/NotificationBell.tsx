"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Notif {
    id: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    leida: boolean;
    clienteId?: string;
    creadoEn: string;
}

const TIPO_ICONO: Record<string, string> = {
    cliente_nuevo: "👤",
    pago_registrado: "💰",
    servicio_solicitado: "⭐",
    servicio_aprobado: "✅",
    servicio_rechazado: "❌",
    cliente_confirmado: "✓",
    estado_cliente: "🔄",
    cuadre_pendiente: "📋",
};

const TIPO_COLOR: Record<string, string> = {
    cliente_nuevo: "#2563eb",
    pago_registrado: "#16a34a",
    servicio_solicitado: "#d97706",
    servicio_aprobado: "#16a34a",
    servicio_rechazado: "#cc1111",
    cliente_confirmado: "#16a34a",
    estado_cliente: "#7c3aed",
    cuadre_pendiente: "#d97706",
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
}

export function NotificationBell({ asMenuItem = false }: { asMenuItem?: boolean }) {
    const [notifs, setNotifs] = useState<Notif[]>([]);
    const [noLeidas, setNoLeidas] = useState(0);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    async function cargar() {
        try {
            const r = await fetch("/api/notificaciones");
            if (!r.ok) return;
            const d = await r.json();
            setNotifs(d.notificaciones || []);
            setNoLeidas(d.noLeidas || 0);
        } catch { }
    }

    useEffect(() => {
        cargar();
        // Polling cada 30 segundos
        const interval = setInterval(cargar, 30000);
        return () => clearInterval(interval);
    }, []);

    // Cerrar al hacer click fuera
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    async function marcarTodas() {
        await fetch("/api/notificaciones?todas=true", { method: "PATCH" });
        setNotifs((prev: Notif[]) => prev.map((n: Notif) => ({ ...n, leida: true })));
        setNoLeidas(0);
    }

    async function marcarUna(id: string) {
        await fetch(`/api/notificaciones?id=${id}`, { method: "PATCH" });
        setNotifs((prev: Notif[]) => prev.map((n: Notif) => n.id === id ? { ...n, leida: true } : n));
        setNoLeidas((prev: number) => Math.max(0, prev - 1));
    }

    function handleNotifClick(n: Notif) {
        if (!n.leida) marcarUna(n.id);
        if (n.clienteId) router.push(`/clientes/${n.clienteId}`);
        setOpen(false);
    }

    return (
        <div ref={ref} style={{ position: "relative" }}>
            {/* Botón campana */}
            {asMenuItem ? (
                <button
                    onClick={() => setOpen((o: boolean) => !o)}
                    style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 12px", borderRadius: 10, border: "none",
                        background: open ? "#f5f5f5" : "transparent",
                        cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left",
                        transition: "all 0.15s",
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLElement).style.background = open ? "#f5f5f5" : "transparent"; }}
                >
                    <div style={{ position: "relative", flexShrink: 0, width: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke={open || noLeidas > 0 ? "#cc1111" : "#6b7280"}
                            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {noLeidas > 0 && (
                            <span style={{
                                position: "absolute", top: -4, right: -4,
                                background: "#cc1111", color: "white",
                                fontSize: 8, fontWeight: 800, minWidth: 14, height: 14, borderRadius: 99,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                padding: "0 3px", lineHeight: 1, border: "1.5px solid white",
                            }}>{noLeidas > 99 ? "99+" : noLeidas}</span>
                        )}
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: open || noLeidas > 0 ? "#cc1111" : "#6b7280" }}>
                        Notificaciones
                        {noLeidas > 0 && <span style={{ fontSize: 11, marginLeft: 6 }}>· {noLeidas} nueva{noLeidas > 1 ? "s" : ""}</span>}
                    </span>
                </button>
            ) : (
                <button
                    onClick={() => setOpen((o: boolean) => !o)}
                    style={{
                        position: "relative", background: open ? "#f5f5f5" : "none", border: "none",
                        cursor: "pointer", padding: "6px", borderRadius: 10,
                        transition: "all 0.15s", flexShrink: 0,
                        color: open ? "#cc1111" : "#6b7280",
                    }}
                    onMouseEnter={(e: React.MouseEvent) => (e.currentTarget as HTMLElement).style.background = "#f5f5f5"}
                    onMouseLeave={(e: React.MouseEvent) => (e.currentTarget as HTMLElement).style.background = "none"}
                    title="Notificaciones"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {noLeidas > 0 && (
                        <span style={{
                            position: "absolute", top: 4, right: 4,
                            background: "#cc1111", color: "white",
                            fontSize: 10, fontWeight: 800,
                            minWidth: 16, height: 16, borderRadius: 99,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: "0 4px", lineHeight: 1, border: "2px solid white",
                        }}>
                            {noLeidas > 99 ? "99+" : noLeidas}
                        </span>
                    )}
                </button>
            )}

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: "fixed", left: 244, top: "auto", bottom: 140,
                    width: 320, background: "white", borderRadius: 16,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: "1px solid #f0f0f0",
                    zIndex: 1000, overflow: "hidden",
                }}>
                    {/* Header */}
                    <div style={{
                        padding: "14px 18px", borderBottom: "1px solid #f5f5f5",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>
                            Notificaciones {noLeidas > 0 && (
                                <span style={{
                                    marginLeft: 6, background: "#cc1111", color: "white",
                                    fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
                                }}>{noLeidas}</span>
                            )}
                        </p>
                        {noLeidas > 0 && (
                            <button onClick={marcarTodas} style={{
                                fontSize: 12, color: "#cc1111", background: "none",
                                border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                            }}>
                                Marcar todas
                            </button>
                        )}
                    </div>

                    {/* Lista */}
                    <div style={{ maxHeight: 420, overflowY: "auto" }}>
                        {notifs.length === 0 ? (
                            <div style={{ padding: "40px 20px", textAlign: "center" }}>
                                <p style={{ fontSize: 32, marginBottom: 8 }}>🔔</p>
                                <p style={{ fontSize: 13, color: "#9ca3af" }}>Sin notificaciones</p>
                            </div>
                        ) : (
                            notifs.map((n: Notif, i: number) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotifClick(n)}
                                    style={{
                                        padding: "12px 18px",
                                        borderBottom: i < notifs.length - 1 ? "1px solid #f9f9f9" : "none",
                                        cursor: n.clienteId ? "pointer" : "default",
                                        background: n.leida ? "white" : "#fef9f9",
                                        display: "flex", gap: 12, alignItems: "flex-start",
                                        transition: "background 0.15s",
                                    }}
                                    onMouseEnter={(e: React.MouseEvent) => (e.currentTarget as HTMLElement).style.background = "#f9f9f9"}
                                    onMouseLeave={(e: React.MouseEvent) => (e.currentTarget as HTMLElement).style.background = n.leida ? "white" : "#fef9f9"}
                                >
                                    {/* Icono */}
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                        background: (TIPO_COLOR[n.tipo] || "#9ca3af") + "15",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 16,
                                    }}>
                                        {TIPO_ICONO[n.tipo] || "🔔"}
                                    </div>

                                    {/* Texto */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                            <p style={{
                                                fontSize: 13, fontWeight: n.leida ? 500 : 700,
                                                color: "#111", lineHeight: 1.3,
                                            }}>{n.titulo}</p>
                                            {!n.leida && (
                                                <span style={{
                                                    width: 8, height: 8, borderRadius: "50%",
                                                    background: "#cc1111", flexShrink: 0, marginTop: 4,
                                                }} />
                                            )}
                                        </div>
                                        <p style={{
                                            fontSize: 12, color: "#6b7280", marginTop: 2,
                                            lineHeight: 1.4,
                                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                        }}>{n.mensaje}</p>
                                        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                                            {timeAgo(n.creadoEn)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}