"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Stats {
  totalClientes: number; clientesActivos: number; clientesPendientes: number;
  clientesPendienteAdmin: number; totalIngresos: number;
  ingresoEfectivo: number; ingresoTransferencia: number; ingresoTarjeta: number;
}
interface AgenteStat { agenteId: string; agenteName: string; totalClientes: number; clientesActivos: number; totalIngresos: number; }
interface ClienteCuadre {
  id: string; nombre: string; apellidos: string; montoPagado?: string;
  formaPago?: string; estado: string;
  paquete?: { nombre: string }; agente?: { name: string };
}
interface Cuadre {
  id: string; fecha: string; cerrado: boolean;
  ingresosEfectivo: string; ingresosTransferencia: string; ingresosTarjeta: string;
  gastosEfectivo: string; gastosTransferencia: string; gastosTarjeta: string;
  notas?: string; detalles: any[]; admin?: { name: string };
  clientesDelDia?: ClienteCuadre[];
}

const COLORS = ["#cc1111", "#2563eb", "#d97706"];

export default function ReportesPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [agentes, setAgentes] = useState<AgenteStat[]>([]);
  const [cuadres, setCuadres] = useState<Cuadre[]>([]);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cuadreAbierto, setCuadreAbierto] = useState<string | null>(null);
  const esAdmin = (session?.user as any)?.rol === "administrador";

  useEffect(() => { cargar(); }, [desde, hasta, esAdmin]);

  async function cargar() {
    setLoading(true);
    const p = new URLSearchParams();
    if (desde) p.set("desde", desde);
    if (hasta) p.set("hasta", hasta);
    const [r1, r2, r3] = await Promise.all([
      fetch(`/api/reportes?tipo=resumen&${p}`).then(r => r.json()),
      esAdmin ? fetch(`/api/reportes?tipo=por_agente&${p}`).then(r => r.json()) : Promise.resolve([]),
      esAdmin ? fetch(`/api/cuadre?${p}`).then(r => r.json()) : Promise.resolve([]),
    ]);
    setStats(r1); setAgentes(r2); setCuadres(Array.isArray(r3) ? r3 : []); setLoading(false);
  }

  const pagoData = stats ? [
    { name: "Efectivo", value: Number(stats.ingresoEfectivo) },
    { name: "Transferencia", value: Number(stats.ingresoTransferencia) },
    { name: "Tarjeta", value: Number(stats.ingresoTarjeta) },
  ].filter(d => d.value > 0) : [];

  const estadoData = stats ? [
    { name: "Pagados", value: Number(stats.clientesActivos), color: "#16a34a" },
    { name: "Pend. pago", value: Number(stats.clientesPendientes), color: "#d97706" },
    { name: "Pend. confirm.", value: Number(stats.clientesPendienteAdmin), color: "#7c3aed" },
  ] : [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Reportes</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {[{ label: "Desde", val: desde, set: setDesde }, { label: "Hasta", val: hasta, set: setHasta }].map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "white", border: "1.5px solid #e0e0e8", borderRadius: 12, padding: "8px 14px"
            }}>
              <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{f.label}</span>
              <input type="date" value={f.val} onChange={e => f.set(e.target.value)}
                style={{
                  border: "none", outline: "none", fontSize: 13, color: "#111",
                  fontFamily: "inherit", background: "transparent"
                }} />
            </div>
          ))}
          {(desde || hasta) && (
            <button onClick={() => { setDesde(""); setHasta(""); }}
              style={{
                fontSize: 13, color: "#cc1111", background: "none", border: "none",
                cursor: "pointer", fontWeight: 600
              }}>× Limpiar</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 64, textAlign: "center", color: "#9ca3af" }}>
          Cargando reportes...
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total clientes", value: String(stats?.totalClientes || 0), accent: "#cc1111" },
              { label: "Pagados", value: String(stats?.clientesActivos || 0), accent: "#16a34a" },
              { label: "Ingresos totales", value: formatCurrency(stats?.totalIngresos || 0), accent: "#d97706" },
              { label: "Cobrado (efectivo)", value: formatCurrency(stats?.ingresoEfectivo || 0), accent: "#2563eb" },
            ].map((k, i) => (
              <div key={i} className="card" style={{ padding: 20, borderTop: `3px solid ${k.accent}` }}>
                <p style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.08em", color: "#9ca3af", marginBottom: 10
                }}>{k.label}</p>
                <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 32, fontWeight: 800, color: k.accent, letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {k.value}
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{
                fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 15,
                color: "#0f0f0f", marginBottom: 20
              }}>Ingresos por forma de pago</h3>
              {pagoData.length === 0 ? (
                <div style={{
                  height: 220, display: "flex", alignItems: "center",
                  justifyContent: "center", color: "#9ca3af"
                }}>Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pagoData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      dataKey="value"
                      labelLine={true}
                      label={({ name, percent, x, y, midAngle }) => {
                        const pct = (percent * 100).toFixed(0);
                        return (
                          <text x={x} y={y} fill="#374151" textAnchor={x > 200 ? "start" : "end"}
                            dominantBaseline="central" fontSize={12} fontWeight={600}>
                            {`${name} ${pct}%`}
                          </text>
                        );
                      }}>
                      {pagoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{
                fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 15,
                color: "#0f0f0f", marginBottom: 20
              }}>Estado de clientes</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={estadoData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {estadoData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rendimiento agentes */}
          {esAdmin && agentes.length > 0 && (
            <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #f0f0f0" }}>
                <h3 style={{
                  fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 15, color: "#0f0f0f",
                  display: "flex", alignItems: "center", gap: 8
                }}>
                  <span style={{ width: 3, height: 18, background: "#cc1111", borderRadius: 4, display: "block" }} />
                  Rendimiento por agente
                </h3>
              </div>
              <table className="data-table">
                <thead><tr>
                  <th>Agente</th>
                  <th style={{ textAlign: "center" }}>Total clientes</th>
                  <th style={{ textAlign: "center" }}>Pagados</th>
                  <th style={{ textAlign: "right" }}>Ingresos generados</th>
                </tr></thead>
                <tbody>
                  {agentes.map(a => (
                    <tr key={a.agenteId}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 10,
                            background: "linear-gradient(135deg,#cc1111,#e52222)",
                            color: "white", display: "flex", alignItems: "center",
                            justifyContent: "center", fontWeight: 800, fontSize: 13
                          }}>
                            {a.agenteName?.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600, color: "#111" }}>{a.agenteName}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>{a.totalClientes}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className="badge badge-activo">{a.clientesActivos}</span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#cc1111" }}>
                        {formatCurrency(a.totalIngresos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Cuadres diarios ─────────────────────────────────────────── */}
          {esAdmin && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{
                padding: "18px 20px", borderBottom: "1px solid #f0f0f0",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <h3 style={{
                  fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 15, color: "#0f0f0f",
                  display: "flex", alignItems: "center", gap: 8
                }}>
                  <span style={{ width: 3, height: 18, background: "#7c3aed", borderRadius: 4, display: "block" }} />
                  Cuadres diarios
                </h3>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{cuadres.length} registros</span>
              </div>

              {cuadres.length === 0 ? (
                <p style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                  No hay cuadres cerrados aún
                </p>
              ) : (
                <div>
                  {cuadres.map(c => {
                    const totalIng = Number(c.ingresosEfectivo) + Number(c.ingresosTransferencia) + Number(c.ingresosTarjeta);
                    const totalGas = Number(c.gastosEfectivo) + Number(c.gastosTransferencia) + Number(c.gastosTarjeta);
                    const neto = totalIng - totalGas;
                    const abierto = cuadreAbierto === c.id;
                    const gastos = (c.detalles || []).filter((d: any) => d.tipo !== "ingreso");

                    return (
                      <div key={c.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                        {/* Fila resumen */}
                        <div onClick={() => setCuadreAbierto(abierto ? null : c.id)}
                          style={{
                            display: "grid", gridTemplateColumns: "160px 1fr 1fr 1fr 1fr 80px",
                            alignItems: "center", padding: "14px 20px", cursor: "pointer",
                            background: abierto ? "#fafafa" : "white", transition: "background 0.15s"
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafafa"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = abierto ? "#fafafa" : "white"}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>
                              {new Date(c.fecha).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                            </p>
                            <p style={{ fontSize: 11, color: "#9ca3af" }}>{c.admin?.name || "—"}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>Ingresos</p>
                            <p style={{ fontWeight: 700, color: "#16a34a", fontSize: 14 }}>{formatCurrency(totalIng)}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>Gastos</p>
                            <p style={{ fontWeight: 700, color: "#cc1111", fontSize: 14 }}>{formatCurrency(totalGas)}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>Neto</p>
                            <p style={{ fontWeight: 800, fontSize: 14, color: neto >= 0 ? "#2563eb" : "#cc1111" }}>
                              {formatCurrency(neto)}
                            </p>
                          </div>
                          <div>
                            <span style={{
                              padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                              background: c.cerrado ? "#dcfce7" : "#fef3c7",
                              color: c.cerrado ? "#166534" : "#92400e"
                            }}>
                              {c.cerrado ? "Cerrado" : "Borrador"}
                            </span>
                          </div>
                          <div style={{ textAlign: "right", fontSize: 18, color: "#9ca3af" }}>
                            {abierto ? "▲" : "▼"}
                          </div>
                        </div>

                        {/* Detalle expandible */}
                        {abierto && (
                          <div style={{ padding: "0 20px 20px", background: "#fafafa" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                              {/* Ingresos desglosados */}
                              <div style={{
                                background: "white", borderRadius: 14, padding: 16,
                                border: "1px solid #f0f0f0"
                              }}>
                                <p style={{
                                  fontSize: 12, fontWeight: 700, color: "#16a34a",
                                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12
                                }}>
                                  💰 Ingresos
                                </p>
                                {/* Totales por forma de pago */}
                                {[
                                  { label: "Efectivo", value: Number(c.ingresosEfectivo) },
                                  { label: "Transferencia", value: Number(c.ingresosTransferencia) },
                                  { label: "Tarjeta", value: Number(c.ingresosTarjeta) },
                                ].map((row, i) => row.value > 0 && (
                                  <div key={i} style={{
                                    display: "flex", justifyContent: "space-between",
                                    padding: "8px 0", borderBottom: "1px solid #f9f9f9"
                                  }}>
                                    <span style={{ fontSize: 13, color: "#374151" }}>{row.label}</span>
                                    <span style={{ fontWeight: 700, color: "#16a34a" }}>{formatCurrency(row.value)}</span>
                                  </div>
                                ))}
                                <div style={{
                                  display: "flex", justifyContent: "space-between",
                                  padding: "10px 0", marginTop: 4, borderTop: "1px solid #e0e0e8"
                                }}>
                                  <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
                                  <span style={{ fontWeight: 800, color: "#16a34a" }}>{formatCurrency(totalIng)}</span>
                                </div>
                                {/* Detalle por cliente */}
                                {c.clientesDelDia && c.clientesDelDia.length > 0 && (
                                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
                                    <p style={{
                                      fontSize: 11, fontWeight: 700, color: "#9ca3af",
                                      textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8
                                    }}>
                                      Detalle de clientes
                                    </p>
                                    {c.clientesDelDia.map((cl: ClienteCuadre) => (
                                      <div key={cl.id} style={{
                                        display: "flex", justifyContent: "space-between",
                                        alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f9f9f9"
                                      }}>
                                        <div>
                                          <p style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
                                            {cl.nombre} {cl.apellidos}
                                          </p>
                                          <p style={{ fontSize: 11, color: "#9ca3af" }}>
                                            {cl.agente?.name || "—"} · {cl.paquete?.nombre || "—"}
                                          </p>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                          <p style={{ fontWeight: 700, color: "#16a34a", fontSize: 13 }}>
                                            {formatCurrency(Number(cl.montoPagado) || 0)}
                                          </p>
                                          <p style={{ fontSize: 11, color: "#9ca3af", textTransform: "capitalize" }}>
                                            {cl.formaPago || "—"}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Gastos desglosados */}
                              <div style={{
                                background: "white", borderRadius: 14, padding: 16,
                                border: "1px solid #f0f0f0"
                              }}>
                                <p style={{
                                  fontSize: 12, fontWeight: 700, color: "#cc1111",
                                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12
                                }}>
                                  📤 Gastos
                                </p>
                                {gastos.length === 0 ? (
                                  <p style={{ fontSize: 13, color: "#9ca3af" }}>Sin gastos registrados</p>
                                ) : gastos.map((g: any, i: number) => (
                                  <div key={i} style={{
                                    display: "flex", justifyContent: "space-between",
                                    alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f9f9f9"
                                  }}>
                                    <div>
                                      <p style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{g.descripcion}</p>
                                      <p style={{ fontSize: 11, color: "#9ca3af", textTransform: "capitalize" }}>{g.formaPago}</p>
                                    </div>
                                    <span style={{ fontWeight: 700, color: "#cc1111" }}>{formatCurrency(Number(g.monto))}</span>
                                  </div>
                                ))}
                                {gastos.length > 0 && (
                                  <div style={{
                                    display: "flex", justifyContent: "space-between",
                                    padding: "10px 0 0", marginTop: 4
                                  }}>
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
                                    <span style={{ fontWeight: 800, color: "#cc1111" }}>{formatCurrency(totalGas)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Neto + notas */}
                            <div style={{
                              marginTop: 12, padding: "12px 16px", borderRadius: 12,
                              background: neto >= 0 ? "#f0fdf4" : "#fff0f0",
                              border: `1px solid ${neto >= 0 ? "#86efac" : "#fca5a5"}`,
                              display: "flex", justifyContent: "space-between", alignItems: "center"
                            }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: neto >= 0 ? "#166534" : "#991b1b" }}>
                                Saldo neto del día
                              </span>
                              <span style={{ fontSize: 18, fontWeight: 800, color: neto >= 0 ? "#16a34a" : "#cc1111" }}>
                                {formatCurrency(neto)}
                              </span>
                            </div>
                            {c.notas && (
                              <div style={{
                                marginTop: 10, padding: "10px 14px", borderRadius: 10,
                                background: "#f9f9f9", fontSize: 13, color: "#374151"
                              }}>
                                📝 {c.notas}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}