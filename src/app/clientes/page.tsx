"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Paquete { id: string; nombre: string; }

interface ValidacionVuelo {
  idaConfirmada: boolean; idaComentario?: string;
  vueltaConfirmada: boolean; vueltaComentario?: string;
}

interface Cliente {
  id: string; nombre: string; apellidos: string; email?: string; telefono: string;
  estado: string; formaPago?: string; montoPagado?: string; moneda: string;
  destino?: string; localizador?: string; creadoEn: string; fechaSalida?: string; fechaRegreso?: string;
  paquete?: { nombre: string }; agente?: { name: string };
  validacionVuelos?: ValidacionVuelo[];
}

const ESTADOS = ["todos", "pagado", "pendiente_pago", "pendiente_confirmacion", "pendiente_admin", "activo", "cancelado", "devuelto"];
const PAGOS = ["todos", "efectivo", "transferencia", "tarjeta"];
const STORAGE_KEY = "clientes_filtros";

function formatFecha(fecha?: string) {
  if (!fecha) return null;
  return new Date(fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function getFiltrosGuardados() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// ── Componente validación vuelos ──────────────────────────────────────────────
function ValidacionVuelosCell({ clienteId, validacion, canEdit }: {
  clienteId: string;
  validacion?: ValidacionVuelo;
  canEdit: boolean;
}) {
  const [ida, setIda] = useState(validacion?.idaConfirmada || false);
  const [vuelta, setVuelta] = useState(validacion?.vueltaConfirmada || false);
  const [idaComentario, setIdaComentario] = useState(validacion?.idaComentario || "");
  const [vueltaComentario, setVueltaComentario] = useState(validacion?.vueltaComentario || "");
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function guardar(campo: "ida" | "vuelta", valor: boolean, comentario: string) {
    setSaving(true);
    await fetch("/api/vuelos-confirmados", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteId, campo, valor, comentario }),
    });
    setSaving(false);
  }

  return (
    <div onClick={e => e.stopPropagation()} style={{ minWidth: 160 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Ida */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={ida}
            disabled={!canEdit || saving}
            onChange={async e => {
              setIda(e.target.checked);
              await guardar("ida", e.target.checked, idaComentario);
            }}
            style={{ width: 15, height: 15, cursor: canEdit ? "pointer" : "default", accentColor: "#2563eb" }}
          />
          <span style={{ fontSize: 12, color: ida ? "#2563eb" : "#9ca3af", fontWeight: ida ? 600 : 400 }}>
            ✈️ Ida {ida ? "✓" : ""}
          </span>
        </div>
        {/* Vuelta */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={vuelta}
            disabled={!canEdit || saving}
            onChange={async e => {
              setVuelta(e.target.checked);
              await guardar("vuelta", e.target.checked, vueltaComentario);
            }}
            style={{ width: 15, height: 15, cursor: canEdit ? "pointer" : "default", accentColor: "#16a34a" }}
          />
          <span style={{ fontSize: 12, color: vuelta ? "#16a34a" : "#9ca3af", fontWeight: vuelta ? 600 : 400 }}>
            🔄 Vuelta {vuelta ? "✓" : ""}
          </span>
        </div>
      </div>
      {/* Comentarios expandibles — solo si puede editar */}
      {canEdit && (
        <div style={{ marginTop: 4 }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ fontSize: 10, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            {expanded ? "▲ ocultar" : "▼ comentarios"}
          </button>
          {expanded && (
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
              <input
                value={idaComentario}
                onChange={e => setIdaComentario(e.target.value)}
                onBlur={() => guardar("ida", ida, idaComentario)}
                placeholder="Nota ida..."
                style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid #e0e0e8", fontFamily: "inherit", outline: "none" }}
              />
              <input
                value={vueltaComentario}
                onChange={e => setVueltaComentario(e.target.value)}
                onBlur={() => guardar("vuelta", vuelta, vueltaComentario)}
                placeholder="Nota vuelta..."
                style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid #e0e0e8", fontFamily: "inherit", outline: "none" }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientesPage() {
  const { data: session } = useSession();
  const rol = (session?.user as any)?.rol;
  const esAdmin = rol === "administrador";
  const esAgenteClientes = rol === "agente_clientes";
  const verValidacionVuelos = esAdmin || esAgenteClientes;
  const router = useRouter();
  const initialized = useRef(false);

  const saved = typeof window !== "undefined" && !initialized.current ? getFiltrosGuardados() : null;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState(saved?.busqueda || "");
  const [estado, setEstado] = useState(saved?.estado || "todos");
  const [pago, setPago] = useState(saved?.pago || "todos");
  const [salidaDesde, setSalidaDesde] = useState(saved?.salidaDesde || "");
  const [salidaHasta, setSalidaHasta] = useState(saved?.salidaHasta || "");
  const [pagina, setPagina] = useState(saved?.pagina || 1);
  const [total, setTotal] = useState(0);
  const [paqueteId, setPaqueteId] = useState(saved?.paqueteId || "todos");
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [mostrarFiltrosFecha, setMostrarFiltrosFecha] = useState(
    !!(saved?.salidaDesde || saved?.salidaHasta)
  );
  const POR_PAG = 15;

  useEffect(() => {
    initialized.current = true;
    fetch("/api/paquetes").then(r => r.json()).then(setPaquetes).catch(() => { });
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        busqueda, estado, pago, paqueteId, salidaDesde, salidaHasta, pagina
      }));
    } catch { }
  }, [busqueda, estado, pago, paqueteId, salidaDesde, salidaHasta, pagina]);

  useEffect(() => { cargar(); }, [busqueda, estado, pago, paqueteId, salidaDesde, salidaHasta, pagina]);

  async function cargar() {
    setLoading(true);
    const p = new URLSearchParams({ pagina: String(pagina), limite: String(POR_PAG) });
    if (busqueda) p.set("busqueda", busqueda);
    if (estado !== "todos") p.set("estado", estado);
    if (pago !== "todos") p.set("formaPago", pago);
    if (paqueteId !== "todos") p.set("paquete", paqueteId);
    if (salidaDesde) p.set("salidaDesde", salidaDesde);
    if (salidaHasta) p.set("salidaHasta", salidaHasta);
    if (verValidacionVuelos) p.set("conVuelos", "1");
    const r = await fetch(`/api/clientes?${p}`);
    const d = await r.json();
    setClientes(d.clientes || []); setTotal(d.total || 0); setLoading(false);
  }

  function limpiarFiltros() {
    setBusqueda(""); setEstado("todos"); setPago("todos");
    setPaqueteId("todos"); setSalidaDesde(""); setSalidaHasta("");
    setPagina(1); setMostrarFiltrosFecha(false);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { }
  }

  function limpiarFechas() {
    setSalidaDesde(""); setSalidaHasta(""); setPagina(1);
  }

  const hayFiltroFecha = salidaDesde || salidaHasta;
  const hayAlgunFiltro = busqueda || estado !== "todos" || pago !== "todos" || paqueteId !== "todos" || hayFiltroFecha;
  const totalPags = Math.ceil(total / POR_PAG);

  const estadoLabel: Record<string, string> = {
    pagado: "Pagado", pendiente_pago: "Pend. pago",
    pendiente_confirmacion: "Pend. confirmación", pendiente_admin: "Pend. admin",
    activo: "Activo", cancelado: "Cancelado", devuelto: "Devuelto", pendiente: "Pendiente",
  };

  const inputStyle = {
    padding: "9px 14px", borderRadius: 12, border: "1.5px solid #e0e0e8",
    fontSize: 13, fontFamily: "inherit", outline: "none", background: "white",
    color: "#374151", cursor: "pointer",
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <Link href="/clientes/nuevo" className="btn-primary"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
          ➕ Nuevo cliente
        </Link>
      </div>

      <div className="card" style={{ padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input placeholder="🔍  Buscar por nombre, email, documento..."
            value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
            style={{ flex: 1, minWidth: 200, ...inputStyle, cursor: "text" }}
            onFocus={e => (e.target as HTMLElement).style.borderColor = "#cc1111"}
            onBlur={e => (e.target as HTMLElement).style.borderColor = "#e0e0e8"} />
          <select value={estado} onChange={e => { setEstado(e.target.value); setPagina(1); }} style={inputStyle}>
            {ESTADOS.map(e => <option key={e} value={e}>{e === "todos" ? "Todos los estados" : estadoLabel[e] || e}</option>)}
          </select>
          <select value={pago} onChange={e => { setPago(e.target.value); setPagina(1); }} style={inputStyle}>
            {PAGOS.map(p => <option key={p} value={p}>{p === "todos" ? "Todas las formas" : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <select value={paqueteId} onChange={e => { setPaqueteId(e.target.value); setPagina(1); }} style={inputStyle}>
            <option value="todos">Todos los paquetes</option>
            {paquetes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <button onClick={() => setMostrarFiltrosFecha(v => !v)}
            style={{
              ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              borderColor: hayFiltroFecha ? "#cc1111" : "#e0e0e8",
              color: hayFiltroFecha ? "#cc1111" : "#374151",
              fontWeight: hayFiltroFecha ? 700 : 500,
              background: hayFiltroFecha ? "#fff5f5" : "white",
            }}>
            ✈️ Vuelos {hayFiltroFecha ? "●" : ""}
          </button>
          {hayAlgunFiltro && (
            <button onClick={limpiarFiltros}
              style={{ fontSize: 12, color: "#cc1111", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              ✕ Limpiar filtros
            </button>
          )}
          <span style={{ fontSize: 13, color: "#9ca3af", whiteSpace: "nowrap" }}>
            {total} resultado{total !== 1 ? "s" : ""}
          </span>
        </div>

        {mostrarFiltrosFecha && (
          <div style={{
            marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0",
            display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap"
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Fecha de salida
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#6b7280" }}>Desde</label>
              <input type="date" value={salidaDesde} onChange={e => { setSalidaDesde(e.target.value); setPagina(1); }} style={{ ...inputStyle, cursor: "pointer" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#6b7280" }}>Hasta</label>
              <input type="date" value={salidaHasta} onChange={e => { setSalidaHasta(e.target.value); setPagina(1); }} style={{ ...inputStyle, cursor: "pointer" }} />
            </div>
            {hayFiltroFecha && (
              <button onClick={limpiarFechas}
                style={{ fontSize: 12, color: "#cc1111", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                ✕ Limpiar fechas
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div className="data-table-wrapper">
          {loading ? (
            <div style={{ padding: 64, textAlign: "center", color: "#9ca3af" }}>Cargando clientes...</div>
          ) : clientes.length === 0 ? (
            <div style={{ padding: 64, textAlign: "center", color: "#9ca3af" }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>👥</p>
              <p>No se encontraron clientes</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Paquete</th>
                  <th>Localizador</th>
                  <th>✈️ Vuelo</th>
                  {esAdmin && <th>Agente</th>}
                  <th>Pago</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                  <th style={{ textAlign: "center" }}>Estado</th>
                  {verValidacionVuelos && <th style={{ textAlign: "center" }}>Confirmación vuelos</th>}
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id} style={{ cursor: "pointer" }}
                    onClick={() => router.push(`/clientes/${c.id}`)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                          background: "linear-gradient(135deg,#cc1111,#e52222)", color: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: 14
                        }}>
                          {c.nombre.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: "#111", fontSize: 14 }}>{c.nombre} {c.apellidos}</p>
                          {c.destino && <p style={{ fontSize: 12, color: "#9ca3af" }}>✈ {c.destino}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <p style={{ fontSize: 13, color: "#374151" }}>{c.telefono}</p>
                      {c.email && <p style={{ fontSize: 12, color: "#9ca3af" }}>{c.email}</p>}
                    </td>
                    <td style={{ fontSize: 13, color: "#374151" }}>{c.paquete?.nombre || "—"}</td>
                    <td style={{ fontSize: 13, color: "#374151", fontWeight: c.localizador ? 600 : 400 }}>
                      {c.localizador || "—"}
                    </td>
                    <td>
                      {c.fechaSalida ? (
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{formatFecha(c.fechaSalida)}</p>
                          {c.fechaRegreso && <p style={{ fontSize: 11, color: "#9ca3af" }}>Regreso: {formatFecha(c.fechaRegreso)}</p>}
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: "#d1d5db" }}>—</span>
                      )}
                    </td>
                    {esAdmin && <td style={{ fontSize: 13, color: "#374151" }}>{c.agente?.name || "—"}</td>}
                    <td style={{ fontSize: 13, color: "#374151", textTransform: "capitalize" }}>{c.formaPago || "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#cc1111" }}>
                      {c.montoPagado ? formatCurrency(c.montoPagado) : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge badge-${c.estado}`}>{estadoLabel[c.estado] || c.estado}</span>
                    </td>
                    {verValidacionVuelos && (
                      <td style={{ textAlign: "center" }}>
                        <ValidacionVuelosCell
                          clienteId={c.id}
                          validacion={c.validacionVuelos?.[0]}
                          canEdit={esAdmin || esAgenteClientes}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPags > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "16px", borderTop: "1px solid #f0f0f0" }}>
            <button onClick={() => setPagina((p: number) => Math.max(1, p - 1))} disabled={pagina === 1}
              className="btn-secondary" style={{ padding: "7px 14px", fontSize: 13 }}>← Anterior</button>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Página {pagina} de {totalPags}</span>
            <button onClick={() => setPagina((p: number) => Math.min(totalPags, p + 1))} disabled={pagina === totalPags}
              className="btn-secondary" style={{ padding: "7px 14px", fontSize: 13 }}>Siguiente →</button>
          </div>
        )}
      </div>
    </div>
  );
}