"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { ESTADO_CLIENTE_LABELS, ESTADO_BADGE_STYLE } from "@/lib/utils";

type KPI = { label: string; value: string; sub: string; accent: string; icon: string; };
type ClienteRow = {
  id: string; nombre: string; apellidos: string;
  paquete: string | null; agente: string | null; agenteImage: string | null;
  montoPagado: string | null; estado: string;
};

// Emojis flotantes de fondo
const FLOATING_EMOJIS = [
  { emoji: "🍒", x: 3, y: 8, size: 36, dur: 18, delay: 0 },
  { emoji: "✈️", x: 12, y: 55, size: 32, dur: 22, delay: 3 },
  { emoji: "🍒", x: 22, y: 25, size: 28, dur: 20, delay: 6 },
  { emoji: "✈️", x: 35, y: 78, size: 34, dur: 25, delay: 1 },
  { emoji: "🍒", x: 48, y: 12, size: 30, dur: 19, delay: 8 },
  { emoji: "✈️", x: 60, y: 65, size: 32, dur: 23, delay: 4 },
  { emoji: "🍒", x: 72, y: 35, size: 28, dur: 21, delay: 2 },
  { emoji: "✈️", x: 83, y: 18, size: 30, dur: 24, delay: 7 },
  { emoji: "🍒", x: 91, y: 70, size: 36, dur: 17, delay: 5 },
  { emoji: "✈️", x: 8, y: 82, size: 28, dur: 26, delay: 9 },
  { emoji: "🍒", x: 45, y: 48, size: 24, dur: 20, delay: 11 },
  { emoji: "✈️", x: 30, y: 92, size: 32, dur: 22, delay: 13 },
  { emoji: "🍒", x: 68, y: 88, size: 28, dur: 18, delay: 15 },
  { emoji: "✈️", x: 86, y: 42, size: 34, dur: 21, delay: 2 },
  { emoji: "🍒", x: 18, y: 96, size: 26, dur: 23, delay: 10 },
  { emoji: "🍒", x: 55, y: 72, size: 32, dur: 19, delay: 4 },
  { emoji: "✈️", x: 42, y: 32, size: 28, dur: 24, delay: 7 },
  { emoji: "🍒", x: 78, y: 58, size: 36, dur: 20, delay: 12 },
  { emoji: "✈️", x: 25, y: 44, size: 30, dur: 17, delay: 6 },
  { emoji: "🍒", x: 95, y: 22, size: 28, dur: 22, delay: 9 },
  { emoji: "✈️", x: 65, y: 5, size: 32, dur: 25, delay: 3 },
  { emoji: "🍒", x: 38, y: 62, size: 24, dur: 21, delay: 14 },
  { emoji: "✈️", x: 52, y: 88, size: 30, dur: 18, delay: 1 },
  { emoji: "🍒", x: 10, y: 38, size: 34, dur: 23, delay: 8 },
  { emoji: "✈️", x: 80, y: 80, size: 28, dur: 20, delay: 16 },
  { emoji: "🍒", x: 62, y: 20, size: 32, dur: 19, delay: 5 },
  { emoji: "✈️", x: 15, y: 68, size: 26, dur: 26, delay: 11 },
  { emoji: "🍒", x: 88, y: 50, size: 30, dur: 22, delay: 2 },
  { emoji: "✈️", x: 33, y: 15, size: 34, dur: 20, delay: 13 },
  { emoji: "🍒", x: 50, y: 95, size: 28, dur: 17, delay: 7 },
];

// Contador animado para KPIs
function AnimatedNumber({ value }: { value: string }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<boolean>(false);

  useEffect(() => {
    if (ref.current) return;
    ref.current = true;

    // Detectar si es número o texto con símbolo
    const match = value.match(/^([€$]?\s*)([\d,.]+)(\s*[€$]?.*)?$/);
    if (!match) { setDisplay(value); return; }

    const prefix = match[1] || "";
    const numStr = match[2].replace(/\./g, "").replace(",", ".");
    const suffix = match[3] || "";
    const target = parseFloat(numStr);

    if (isNaN(target)) { setDisplay(value); return; }

    const duration = 1200;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease out cubic
      const current = Math.round(ease * target * 100) / 100;
      const formatted = current.toLocaleString("es-ES", {
        minimumFractionDigits: target % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2,
      });
      setDisplay(`${prefix}${formatted}${suffix}`);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);

  return <span>{display}</span>;
}

export function DashboardClient({ kpis, clientes, esAdmin, pendientesConfirmacion, serviciosPendientes }: {
  kpis: KPI[]; clientes: ClienteRow[]; esAdmin: boolean;
  pendientesConfirmacion: number; serviciosPendientes: number;
}) {
  return (
    <div style={{ position: "relative" }}>

      {/* ── Fondo flotante cerezas y aviones ── */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        zIndex: 0, overflow: "hidden", marginLeft: 240
      }}>
        {FLOATING_EMOJIS.map((e, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${e.x}%`,
            top: `${e.y}%`,
            fontSize: e.size,
            opacity: 0.15,
            animation: `floatEmoji ${e.dur}s ease-in-out ${e.delay}s infinite alternate`,
            userSelect: "none",
          }}>
            {e.emoji}
          </div>
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── KPI cards con contador animado ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
          {kpis.map((k, i) => (
            <div key={i} className="card kpi-card"
              style={{
                borderTop: `3px solid ${k.accent}`, padding: 20,
                animationDelay: `${i * 80}ms`
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "translateY(-4px)";
                el.style.boxShadow = `0 12px 32px rgba(0,0,0,0.1)`;
                el.style.borderColor = k.accent;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "";
                el.style.borderColor = "#ebebeb";
              }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", marginBottom: 16
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.08em", color: "#9ca3af"
                }}>{k.label}</p>
                <span style={{ fontSize: 22, transition: "transform 0.3s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "rotate(15deg) scale(1.2)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "rotate(0) scale(1)"}>
                  {k.icon}
                </span>
              </div>
              <p style={{
                fontFamily: "'Inter', system-ui, sans-serif", fontSize: 32, fontWeight: 800,
                color: "#0f0f0f", marginBottom: 4, letterSpacing: "-0.03em", lineHeight: 1
              }}>
                <AnimatedNumber value={k.value} />
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af" }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Acciones rápidas ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: esAdmin ? "repeat(3,1fr)" : "1fr",
          gap: 16, marginBottom: 28
        }}>
          <AccionCard href="/clientes/nuevo" icon="➕" label="Nuevo cliente" desc="Registrar contratación" />
          {esAdmin && (
            <>
              <AccionCard href="/servicios-especiales" icon="⭐" label="Servicios especiales"
                desc={serviciosPendientes > 0 ? `${serviciosPendientes} pendiente${serviciosPendientes > 1 ? "s" : ""}` : "Gestionar solicitudes"}
                badge={serviciosPendientes > 0 ? serviciosPendientes : undefined} />
              <AccionCard href="/reportes" icon="📊" label="Reportes" desc="Ver estadísticas" />
            </>
          )}
        </div>

        {/* ── Alerta pendientes confirmación ── */}
        {esAdmin && pendientesConfirmacion > 0 && (
          <div style={{
            padding: "14px 20px", background: "#f5f3ff", borderRadius: 14,
            border: "1.5px solid #c4b5fd", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 12,
            animation: "slideInAlert 0.4s cubic-bezier(0.16,1,0.3,1)"
          }}>
            <span style={{ fontSize: 22, animation: "bellRing 1s ease-in-out 1s 3" }}>🔔</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#5b21b6" }}>
                {pendientesConfirmacion} cliente{pendientesConfirmacion > 1 ? "s" : ""} pendiente{pendientesConfirmacion > 1 ? "s" : ""} de confirmación de pago
              </p>
              <p style={{ fontSize: 12, color: "#7c3aed", marginTop: 2 }}>
                Revisa la lista de clientes y confirma los pagos recibidos
              </p>
            </div>
            <Link href="/clientes?estado=pendiente_confirmacion"
              style={{
                marginLeft: "auto", fontSize: 13, fontWeight: 700,
                color: "#7c3aed", textDecoration: "none", whiteSpace: "nowrap",
                padding: "6px 14px", borderRadius: 8, background: "#ede9fe",
                transition: "all 0.15s"
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#ddd6fe"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#ede9fe"}>
              Ver ahora →
            </Link>
          </div>
        )}

        {/* ── Últimos clientes ── */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px", borderBottom: "1px solid #f0f0f0"
          }}>
            <h2 style={{
              fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 18, color: "#0f0f0f",
              display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ width: 3, height: 20, background: "#cc1111", borderRadius: 4, display: "block" }} />
              {esAdmin ? "Últimos clientes" : "Mis últimos clientes"}
            </h2>
            <Link href="/clientes"
              style={{
                fontSize: 13, fontWeight: 600, color: "#cc1111", textDecoration: "none",
                padding: "6px 14px", borderRadius: 8, border: "1.5px solid #fca5a5",
                transition: "all 0.15s"
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "#cc1111"; el.style.color = "white";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "transparent"; el.style.color = "#cc1111";
              }}>
              Ver todos →
            </Link>
          </div>

          {clientes.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#9ca3af" }}>
              <p style={{ fontSize: 48, marginBottom: 12, animation: "floatEmoji 3s ease-in-out infinite alternate" }}>✈️</p>
              <p style={{ marginBottom: 8, fontWeight: 500 }}>Aún no hay clientes registrados</p>
              <Link href="/clientes/nuevo" style={{ fontSize: 13, fontWeight: 600, color: "#cc1111", textDecoration: "none" }}>
                + Registrar primer cliente
              </Link>
            </div>
          ) : clientes.map((c, i) => (
            <ClienteRowItem key={c.id} c={c} index={i} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes floatEmoji {
          0%   { transform: translateY(0px) rotate(0deg); }
          50%  { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(8px) rotate(-3deg); }
        }
        @keyframes slideInAlert {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes bellRing {
          0%,100% { transform:rotate(0); }
          20%     { transform:rotate(15deg); }
          40%     { transform:rotate(-15deg); }
          60%     { transform:rotate(10deg); }
          80%     { transform:rotate(-8deg); }
        }
        @keyframes pulseBadge {
          0%,100% { box-shadow: 0 0 0 0 rgba(204,17,17,0.4); }
          50%     { box-shadow: 0 0 0 6px rgba(204,17,17,0); }
        }
        @keyframes staggerIn {
          from { opacity:0; transform:translateX(-12px); }
          to   { opacity:1; transform:translateX(0); }
        }
      `}</style>
    </div>
  );
}

function AccionCard({ href, icon, label, desc, badge }: {
  href: string; icon: string; label: string; desc: string; badge?: number;
}) {
  return (
    <Link href={href} className="card"
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "18px 20px",
        textDecoration: "none", transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        position: "relative", overflow: "hidden"
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#cc1111";
        el.style.boxShadow = "0 8px 24px rgba(204,17,17,0.12)";
        el.style.transform = "translateY(-3px)";
        const icon = el.querySelector(".accion-icon") as HTMLElement;
        if (icon) { icon.style.background = "#cc1111"; icon.style.transform = "scale(1.1) rotate(-5deg)"; }
        const arrow = el.querySelector(".accion-arrow") as HTMLElement;
        if (arrow) { arrow.style.transform = "translateX(4px)"; }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#ebebeb";
        el.style.boxShadow = "none";
        el.style.transform = "translateY(0)";
        const icon = el.querySelector(".accion-icon") as HTMLElement;
        if (icon) { icon.style.background = "#fff0f0"; icon.style.transform = "scale(1) rotate(0)"; }
        const arrow = el.querySelector(".accion-arrow") as HTMLElement;
        if (arrow) { arrow.style.transform = "translateX(0)"; }
      }}>
      <div className="accion-icon"
        style={{
          width: 44, height: 44, borderRadius: 12, background: "#fff0f0",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0, position: "relative",
          transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)"
        }}>
        {icon}
        {badge && (
          <span style={{
            position: "absolute", top: -6, right: -6, width: 20, height: 20,
            borderRadius: "50%", background: "#cc1111", color: "white", fontSize: 11,
            fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            animation: "pulseBadge 1.5s ease-in-out infinite"
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 15, color: "#0f0f0f" }}>{label}</p>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{desc}</p>
      </div>
      <span className="accion-arrow"
        style={{ fontSize: 18, color: "#cc1111", transition: "transform 0.2s" }}>→</span>
    </Link>
  );
}

function ClienteRowItem({ c, index }: { c: ClienteRow; index: number }) {
  const badge = ESTADO_BADGE_STYLE?.[c.estado] || { bg: "#f3f4f6", color: "#6b7280" };
  const label = ESTADO_CLIENTE_LABELS?.[c.estado] || c.estado;
  const isPendiente = c.estado === "pendiente_confirmacion" || c.estado === "pendiente_pago";

  return (
    <Link href={`/clientes/${c.id}`}
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
        borderBottom: "1px solid #f9f9f9", textDecoration: "none", transition: "all 0.15s",
        animation: `staggerIn 0.35s ease ${index * 60}ms both`
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "#fff8f8";
        el.style.paddingLeft = "24px";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "white";
        el.style.paddingLeft = "20px";
      }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: "linear-gradient(135deg,#cc1111,#e52222)", color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 16, flexShrink: 0,
        boxShadow: "0 4px 10px rgba(204,17,17,0.25)"
      }}>
        {c.nombre.charAt(0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontWeight: 600, fontSize: 14, color: "#111",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
        }}>
          {c.nombre} {c.apellidos}
        </p>
        {c.agente && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <Avatar name={c.agente} image={c.agenteImage} size={28} />
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{c.paquete || "Sin paquete"} · {c.agente}</span>
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: "#cc1111" }}>
          {c.montoPagado ? formatCurrency(c.montoPagado) : "—"}
        </p>
        <span style={{
          marginTop: 4, display: "inline-flex", padding: "2px 8px",
          borderRadius: 99, fontSize: 11, fontWeight: 700,
          background: badge.bg, color: badge.color,
          animation: isPendiente ? "pulseBadge 2s ease-in-out infinite" : "none"
        }}>
          {label}
        </span>
      </div>
    </Link>
  );
}