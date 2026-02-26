"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { formatCurrency } from "@/lib/utils";

interface Cliente {
  id: string; nombre: string; apellidos: string; email?: string; telefono: string;
  estado: string; formaPago?: string; montoPagado?: string; moneda: string;
  destino?: string; creadoEn: string;
  paquete?: { nombre: string }; agente?: { name: string };
}

const ESTADOS = ["todos", "pendiente", "pendiente_admin", "activo", "cancelado"];
const PAGOS = ["todos", "efectivo", "transferencia", "tarjeta"];

export default function ClientesPage() {
  const { data: session } = useSession();
  const esAdmin = (session?.user as any)?.rol === "administrador";
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const [pago, setPago] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const POR_PAG = 15;

  useEffect(() => { cargar(); }, [busqueda, estado, pago, pagina]);

  async function cargar() {
    setLoading(true);
    const p = new URLSearchParams({ pagina: String(pagina), limite: String(POR_PAG) });
    if (busqueda) p.set("busqueda", busqueda);
    if (estado !== "todos") p.set("estado", estado);
    if (pago !== "todos") p.set("formaPago", pago);
    const r = await fetch(`/api/clientes?${p}`);
    const d = await r.json();
    setClientes(d.clientes || []); setTotal(d.total || 0); setLoading(false);
  }

  const totalPags = Math.ceil(total / POR_PAG);

  const estadoLabel: Record<string, string> = {
    pendiente: "Pendiente", pendiente_admin: "Pend. admin", activo: "Activo", cancelado: "Cancelado"
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <Link href="/clientes/nuevo" className="btn-primary"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
          ➕ Nuevo cliente
        </Link>
      </div>

      {/* Filtros */}
      <div className="card" style={{
        padding: "16px 20px", marginBottom: 20,
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap"
      }}>
        <input placeholder="🔍  Buscar por nombre, email, documento..."
          value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
          style={{
            flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 12,
            border: "1.5px solid #e0e0e8", fontSize: 13, fontFamily: "inherit",
            outline: "none", background: "white"
          }}
          onFocus={e => (e.target as HTMLElement).style.borderColor = "#cc1111"}
          onBlur={e => (e.target as HTMLElement).style.borderColor = "#e0e0e8"} />
        <select value={estado} onChange={e => { setEstado(e.target.value); setPagina(1); }}
          style={{
            padding: "9px 14px", borderRadius: 12, border: "1.5px solid #e0e0e8",
            fontSize: 13, fontFamily: "inherit", outline: "none", background: "white", color: "#374151", cursor: "pointer"
          }}>
          {ESTADOS.map(e => <option key={e} value={e}>{e === "todos" ? "Todos los estados" : estadoLabel[e] || e}</option>)}
        </select>
        <select value={pago} onChange={e => { setPago(e.target.value); setPagina(1); }}
          style={{
            padding: "9px 14px", borderRadius: 12, border: "1.5px solid #e0e0e8",
            fontSize: 13, fontFamily: "inherit", outline: "none", background: "white", color: "#374151", cursor: "pointer"
          }}>
          {PAGOS.map(p => <option key={p} value={p}>{p === "todos" ? "Todas las formas" : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <span style={{ fontSize: 13, color: "#9ca3af", whiteSpace: "nowrap" }}>
          {total} resultado{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tabla */}
      <div className="card" style={{ overflow: "hidden" }}>
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
                {esAdmin && <th>Agente</th>}
                <th>Pago</th>
                <th style={{ textAlign: "right" }}>Monto</th>
                <th style={{ textAlign: "center" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id} style={{ cursor: "pointer" }}
                  onClick={() => window.location.href = `/clientes/${c.id}`}>
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
                        <p style={{ fontWeight: 600, color: "#111", fontSize: 14 }}>
                          {c.nombre} {c.apellidos}
                        </p>
                        {c.destino && <p style={{ fontSize: 12, color: "#9ca3af" }}>✈ {c.destino}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <p style={{ fontSize: 13, color: "#374151" }}>{c.telefono}</p>
                    {c.email && <p style={{ fontSize: 12, color: "#9ca3af" }}>{c.email}</p>}
                  </td>
                  <td style={{ fontSize: 13, color: "#374151" }}>{c.paquete?.nombre || "—"}</td>
                  {esAdmin && <td style={{ fontSize: 13, color: "#374151" }}>{c.agente?.name || "—"}</td>}
                  <td style={{ fontSize: 13, color: "#374151", textTransform: "capitalize" }}>
                    {c.formaPago || "—"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#cc1111" }}>
                    {c.montoPagado ? formatCurrency(c.montoPagado) : "—"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`badge badge-${c.estado}`}>
                      {estadoLabel[c.estado] || c.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {totalPags > 1 && (
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            gap: 8, padding: "16px", borderTop: "1px solid #f0f0f0"
          }}>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
              className="btn-secondary" style={{ padding: "7px 14px", fontSize: 13 }}>← Anterior</button>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Página {pagina} de {totalPags}</span>
            <button onClick={() => setPagina(p => Math.min(totalPags, p + 1))} disabled={pagina === totalPags}
              className="btn-secondary" style={{ padding: "7px 14px", fontSize: 13 }}>Siguiente →</button>
          </div>
        )}
      </div>
    </div>
  );
}
