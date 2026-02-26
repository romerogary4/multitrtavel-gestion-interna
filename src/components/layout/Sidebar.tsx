"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { TodoPanel, useTareasBadge } from "@/components/ui/TodoPanel";

const navItems = [
  { href: "/dashboard", label: "Dashboard", emoji: "🏠", adminOnly: false, agenteVisible: true },
  { href: "/clientes", label: "Clientes", emoji: "👥", adminOnly: false, agenteVisible: true },
  { href: "/clientes/nuevo", label: "Nuevo cliente", emoji: "➕", adminOnly: false, agenteVisible: true },

  { href: "/servicios-especiales", label: "Servicios especiales", emoji: "⭐", adminOnly: false, agenteVisible: true },
  { href: "/reportes", label: "Reportes", emoji: "📊", adminOnly: true, agenteVisible: false },
  { href: "/cuadre-diario", label: "Cuadre diario", emoji: "📋", adminOnly: true, agenteVisible: false },
  { href: "/paquetes", label: "Paquetes", emoji: "✈️", adminOnly: true, agenteVisible: false },
  { href: "/admin/agentes", label: "Agentes", emoji: "👤", adminOnly: true, agenteVisible: false },
  { href: "/admin/servicios", label: "Tipos de servicio", emoji: "⭐", adminOnly: true, agenteVisible: false },
];

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { data: session } = useSession();
  const esAdmin = (session?.user as any)?.rol === "administrador";
  const [todoOpen, setTodoOpen] = useState(false);
  const { pendientes: tareasPendientes, vencidas: tareasVencidas } = useTareasBadge();

  const userName = session?.user?.name || "Usuario";
  const userRol = (session?.user as any)?.rol || "agente";
  const userImage = session?.user?.image || null;

  async function handleSignOut() {
    await signOut();
    router.push("/auth/login");
  }

  const filtered = navItems.filter(i => esAdmin ? !i.adminOnly || true : i.agenteVisible);
  const mainNav = filtered.filter(i => ["/dashboard", "/clientes", "/clientes/nuevo"].includes(i.href));
  const gestionNav = filtered.filter(i => ["/servicios-especiales", "/reportes"].includes(i.href));
  const adminNav = filtered.filter(i => ["/cuadre-diario", "/paquetes", "/admin/agentes", "/admin/servicios"].includes(i.href));

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 14, overflow: "hidden",
              background: "#f8f8f8", border: "1.5px solid #ebebeb", flexShrink: 0
            }}>
              <img src="/logo.jpg" alt="Logo"
                style={{ objectFit: "contain", width: "100%", height: "100%" }} />
            </div>
            <div>
              <p style={{
                fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 16,
                color: "#0f0f0f", lineHeight: 1.2
              }}>MultiTravel</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#cc1111" }}>Cherry Matute</p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
          <p className="nav-section-label">Principal</p>
          {mainNav.map(i => <NavItem key={i.href} item={i} pathname={String(pathname)} />)}

          {gestionNav.length > 0 && (
            <>
              <p className="nav-section-label">Gestión</p>
              {gestionNav.map(i => <NavItem key={i.href} item={i} pathname={String(pathname)} />)}
            </>
          )}

          {esAdmin && adminNav.length > 0 && (
            <>
              <p className="nav-section-label">Administración</p>
              {adminNav.map(i => <NavItem key={i.href} item={i} pathname={String(pathname)} />)}
            </>
          )}
        </nav>

        {/* ── Herramientas ── */}
        <div style={{ padding: "8px 12px", borderTop: "1px solid #f0f0f0" }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#b0b0b8", padding: "10px 4px 8px"
          }}>Herramientas</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>

            {/* Tareas */}
            <button onClick={() => setTodoOpen(true)} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 10, border: "none",
              background: tareasPendientes > 0 ? (tareasVencidas > 0 ? "#fff0f0" : "#fffbeb") : "transparent",
              cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left",
              transition: "all 0.15s",
            }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { if (!tareasPendientes) (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { if (!tareasPendientes) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke={tareasVencidas > 0 ? "#cc1111" : tareasPendientes > 0 ? "#d97706" : "#6b7280"}
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" /><path d="M9 7h6" /><path d="M9 17h4" />
                </svg>
                {tareasPendientes > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -4,
                    background: tareasVencidas > 0 ? "#cc1111" : "#d97706",
                    color: "white", fontSize: 8, fontWeight: 800,
                    minWidth: 14, height: 14, borderRadius: 99,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px", lineHeight: 1, border: "1.5px solid white",
                  }}>{tareasPendientes > 99 ? "99+" : tareasPendientes}</span>
                )}
              </div>
              <span style={{
                fontSize: 13.5, fontWeight: 500,
                color: tareasVencidas > 0 ? "#cc1111" : tareasPendientes > 0 ? "#d97706" : "#6b7280",
              }}>
                Mis tareas
                {tareasVencidas > 0 && <span style={{ fontSize: 11, marginLeft: 6, color: "#cc1111" }}>· {tareasVencidas} vencida{tareasVencidas > 1 ? "s" : ""}</span>}
              </span>
            </button>

            {/* Notificaciones */}
            <div style={{ padding: "2px 0" }}>
              <NotificationBell asMenuItem />
            </div>

          </div>
        </div>

        <div style={{ padding: "12px", borderTop: "1px solid #f0f0f0" }}>
          <div style={{ background: "#fafafa", borderRadius: 14, padding: "14px", border: "1px solid #ebebeb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Avatar name={userName} image={userImage} size={52} round />
              <div style={{ overflow: "hidden", flex: 1 }}>
                <p style={{
                  fontSize: 14, fontWeight: 700, color: "#111", whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis"
                }}>{userName}</p>
                <p style={{ fontSize: 12, color: "#9ca3af", textTransform: "capitalize", marginTop: 2 }}>{userRol}</p>
              </div>
            </div>
            <button onClick={handleSignOut}
              style={{
                width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 8,
                fontSize: 12, color: "#9ca3af", background: "transparent", border: "none",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s"
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
                (e.currentTarget as HTMLElement).style.background = "#fee2e2";
                (e.currentTarget as HTMLElement).style.color = "#cc1111";
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "#9ca3af";
              }}>
              ← Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
      <TodoPanel open={todoOpen} onClose={() => setTodoOpen(false)} />
    </>
  );
}

function NavItem({ item, pathname, badge }: { key?: string; item: typeof navItems[0]; pathname: string; badge?: number }) {
  const isActive = pathname === item.href ||
    (item.href !== "/clientes" && pathname.startsWith(item.href + "/"));
  return (
    <Link href={item.href} className={`nav-item ${isActive ? "active" : ""}`}
      style={{ position: "relative" }}>
      <span style={{ fontSize: 15 }}>{item.emoji}</span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {badge && badge > 0 && (
        <span style={{
          minWidth: 18, height: 18, borderRadius: 99, background: "#cc1111",
          color: "white", fontSize: 10, fontWeight: 700, display: "flex",
          alignItems: "center", justifyContent: "center", padding: "0 5px"
        }}>
          {badge}
        </span>
      )}
      {isActive && !badge && <span className="nav-dot" />}
    </Link>
  );
}