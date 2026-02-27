"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface ClienteDia { id: string; nombre: string; apellidos: string; montoPagado?: string; formaPago?: string; moneda: string; paquete?: { nombre: string }; agente?: { name: string }; }
interface Totales { ingresoEfectivo: number; ingresoTransferencia: number; ingresoTarjeta: number; totalClientes: number; }
interface CuadrePendiente { id: string; fecha: string; cerrado: boolean; }
type FormaPago = "efectivo" | "transferencia" | "tarjeta";
interface GastoFijo { tipo: string; label: string; campo: string; placeholder: string; }
interface Gasto { tipo: string; label: string; referencia: string; monto: string; formaPago: FormaPago; }

const GASTOS_FIJOS: GastoFijo[] = [
  { tipo: "vuelo", label: "✈️ Vuelo", campo: "Localizador", placeholder: "ABC123" },
  { tipo: "azafata", label: "👩‍✈️ Azafata", campo: "Localizador", placeholder: "LOC456" },
  { tipo: "notaria", label: "📋 Notaria", campo: "Protocolo", placeholder: "PROT-001" },
  { tipo: "maleta", label: "🧳 Maleta", campo: "Localizador", placeholder: "MAL789" },
  { tipo: "cambio", label: "💱 Cambio", campo: "Localizador", placeholder: "CAM-001" },
  { tipo: "otro", label: "📝 Otro", campo: "Descripción", placeholder: "Descripción del gasto" },
];

export default function CuadreDiarioPage() {
  const hoyStr = new Date().toISOString().split("T")[0];
  const [fecha, setFecha] = useState(hoyStr);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [clientes, setClientes] = useState<ClienteDia[]>([]);
  const [cuadreId, setCuadreId] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [notas, setNotas] = useState("");
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [pendientes, setPendientes] = useState<CuadrePendiente[]>([]);
  const [verClientes, setVerClientes] = useState(false);
  const [tipoGasto, setTipoGasto] = useState("vuelo");
  const [refGasto, setRefGasto] = useState("");
  const [montoGasto, setMontoGasto] = useState("");
  const [pagoGasto, setPagoGasto] = useState<FormaPago>("efectivo");

  // Refs para acceder a valores actuales dentro de callbacks sin re-render
  const totalesRef = useRef<Totales | null>(null);
  const gastosRef = useRef<Gasto[]>([]);
  const notasRef = useRef("");
  const fechaRef = useRef(hoyStr);
  const cerradoRef = useRef(false);

  // Sync refs con state
  useEffect(() => { totalesRef.current = totales; }, [totales]);
  useEffect(() => { gastosRef.current = gastos; }, [gastos]);
  useEffect(() => { notasRef.current = notas; }, [notas]);
  useEffect(() => { fechaRef.current = fecha; }, [fecha]);
  useEffect(() => { cerradoRef.current = cerrado; }, [cerrado]);

  const cargar = useCallback(async (f: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/cuadre?tipo=automatico&fecha=${f}`);
      if (!r.ok) throw new Error("Error " + r.status);
      const d = await r.json();
      setTotales(d.totales);
      totalesRef.current = d.totales;
      setClientes(d.clientesDelDia || []);
      if (d.cuadreGuardado) {
        setCuadreId(d.cuadreGuardado.id);
        setCerrado(d.cuadreGuardado.cerrado);
        cerradoRef.current = d.cuadreGuardado.cerrado;
        setNotas(d.cuadreGuardado.notas || "");
        const gastosRecuperados = (d.cuadreGuardado.detalles || []).map((det: any) => ({
          tipo: det.tipo || "otro",
          label: det.descripcion?.split(" — ")[0] || det.descripcion || "",
          referencia: det.descripcion?.includes(" — ") ? det.descripcion.split(" — ")[1] : "",
          monto: String(det.monto),
          formaPago: det.formaPago,
        }));
        setGastos(gastosRecuperados);
        gastosRef.current = gastosRecuperados;
      } else {
        setCuadreId(null); setCerrado(false); cerradoRef.current = false;
        setNotas(""); setGastos([]); gastosRef.current = [];
      }
    } catch (e) {
      toast.error("Error cargando cuadre");
    } finally {
      setLoading(false);
    }
  }, []);

  async function cargarPendientes() {
    try {
      const r = await fetch("/api/cuadre?tipo=pendientes");
      if (r.ok) setPendientes(await r.json());
    } catch { }
  }

  useEffect(() => {
    cargar(fecha);
    cargarPendientes();
  }, [fecha, cargar]);

  // ── Guardar en BD (upsert silencioso) ──────────────────────────────────────
  async function guardarEnBD(gastosActuales: Gasto[], notasActuales: string, cerrar = false) {
    const tots = totalesRef.current;
    if (!tots) return;
    const ge = gastosActuales.filter(g => g.formaPago === "efectivo").reduce((s, g) => s + Number(g.monto), 0);
    const gt = gastosActuales.filter(g => g.formaPago === "transferencia").reduce((s, g) => s + Number(g.monto), 0);
    const gtar = gastosActuales.filter(g => g.formaPago === "tarjeta").reduce((s, g) => s + Number(g.monto), 0);
    try {
      const r = await fetch("/api/cuadre", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: fechaRef.current,
          ingresosEfectivo: tots.ingresoEfectivo,
          ingresosTransferencia: tots.ingresoTransferencia,
          ingresosTarjeta: tots.ingresoTarjeta,
          gastosEfectivo: ge, gastosTransferencia: gt, gastosTarjeta: gtar,
          notas: notasActuales,
          detalles: gastosActuales.map(g => ({
            tipo: g.tipo,
            descripcion: `${g.label}${g.referencia ? ` — ${g.referencia}` : ""}`,
            monto: Number(g.monto), formaPago: g.formaPago,
          })),
          accion: cerrar ? "cerrar" : "guardar",
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setCuadreId(d.id);
        if (cerrar) { setCerrado(true); cerradoRef.current = true; }
      }
    } catch { }
  }

  function agregarGasto() {
    const gf = GASTOS_FIJOS.find(g => g.tipo === tipoGasto);
    if (!gf || !montoGasto) { toast.error("Indica el monto del gasto"); return; }
    if (tipoGasto !== "otro" && !refGasto) { toast.error(`Indica el ${gf.campo}`); return; }
    const nuevo: Gasto = { tipo: tipoGasto, label: gf.label, referencia: refGasto, monto: montoGasto, formaPago: pagoGasto };
    const nuevosGastos = [...gastosRef.current, nuevo];
    setGastos(nuevosGastos);
    gastosRef.current = nuevosGastos;
    setRefGasto(""); setMontoGasto("");
    guardarEnBD(nuevosGastos, notasRef.current); // auto-save
  }

  function eliminarGasto(i: number) {
    const nuevosGastos = gastosRef.current.filter((_, idx) => idx !== i);
    setGastos(nuevosGastos);
    gastosRef.current = nuevosGastos;
    guardarEnBD(nuevosGastos, notasRef.current); // auto-save
  }

  async function cerrarDia() {
    const fechaLabel = new Date(fechaRef.current + "T12:00:00")
      .toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    if (!confirm(`¿Cerrar el cuadre del ${fechaLabel}? No podrá modificarse.`)) return;
    setGuardando(true);
    await guardarEnBD(gastosRef.current, notasRef.current, true);
    toast.success("✓ Día cerrado correctamente");
    setGuardando(false);
    cargarPendientes();
  }

  async function guardarBorrador() {
    setGuardando(true);
    await guardarEnBD(gastosRef.current, notasRef.current);
    toast.success("Borrador guardado");
    setGuardando(false);
  }

  const totalIngresos = totales
    ? Number(totales.ingresoEfectivo) + Number(totales.ingresoTransferencia) + Number(totales.ingresoTarjeta) : 0;
  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto || 0), 0);
  const saldoNeto = totalIngresos - totalGastos;
  const gastoFijoActual = GASTOS_FIJOS.find(g => g.tipo === tipoGasto)!;
  const esPasado = fecha < hoyStr;
  const otrosPendientes = pendientes.filter(p => (p.fecha?.split("T")[0] || p.fecha) !== fecha);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cuadre diario</h1>
          <p style={{ fontSize: 14, color: "#9ca3af", marginTop: 4, marginLeft: 14 }}>
            {cerrado ? "✅ Día cerrado"
              : cuadreId ? "💾 Borrador guardado — pendiente de cierre"
                : "Sin cuadre guardado aún"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="date" value={fecha} max={hoyStr}
            onChange={e => setFecha(e.target.value)}
            style={{
              padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e0e0e8",
              fontSize: 14, fontFamily: "inherit", outline: "none", background: "white", color: "#111"
            }} />
          <button onClick={() => setVerClientes(!verClientes)} className="btn-secondary" style={{ fontSize: 13 }}>
            👥 {totales?.totalClientes || 0}
          </button>
        </div>
      </div>

      {/* Días pendientes */}
      {otrosPendientes.length > 0 && (
        <div style={{
          padding: "12px 18px", background: "#fff7ed", borderRadius: 14,
          border: "1.5px solid #fed7aa", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 12
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#c2410c" }}>
              {otrosPendientes.length} día{otrosPendientes.length > 1 ? "s" : ""} pendiente{otrosPendientes.length > 1 ? "s" : ""} de cierre
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {otrosPendientes.map(p => {
                const f = p.fecha?.split("T")[0] || p.fecha;
                return (
                  <button key={p.id} onClick={() => setFecha(f)}
                    style={{
                      padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: "#fed7aa", color: "#c2410c", border: "none", cursor: "pointer",
                      fontFamily: "inherit"
                    }}>
                    {new Date(f + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Banner cerrado */}
      {cerrado && (
        <div style={{
          padding: "14px 20px", background: "#f0fdf4", borderRadius: 14,
          border: "1.5px solid #86efac", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 12
        }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#166534" }}>
            Este día ya fue cerrado. Los datos son de solo lectura.
          </p>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: 64, textAlign: "center", color: "#9ca3af" }}>
          Calculando cuadre...
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total ingresos", value: formatCurrency(totalIngresos), accent: "#16a34a", icon: "💰" },
              { label: "Total gastos", value: formatCurrency(totalGastos), accent: "#cc1111", icon: "📤" },
              {
                label: "Saldo neto", value: formatCurrency(saldoNeto),
                accent: saldoNeto >= 0 ? "#2563eb" : "#cc1111", icon: saldoNeto >= 0 ? "📊" : "⚠️"
              },
            ].map((k, i) => (
              <div key={i} className="card" style={{ padding: 24, borderTop: `3px solid ${k.accent}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <p style={{
                    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "#9ca3af"
                  }}>{k.label}</p>
                  <span style={{ fontSize: 22 }}>{k.icon}</span>
                </div>
                <p style={{
                  fontFamily: "'Inter', system-ui, sans-serif", fontSize: 32, fontWeight: 800,
                  color: k.accent, letterSpacing: "-0.03em", lineHeight: 1
                }}>
                  {k.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Ingresos */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{
                fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 16, color: "#0f0f0f",
                marginBottom: 18, display: "flex", alignItems: "center", gap: 8
              }}>
                <span style={{ width: 3, height: 18, background: "#16a34a", borderRadius: 4, display: "block" }} />
                Ingresos del día
              </h3>
              {[
                { label: "💵 Efectivo", value: totales?.ingresoEfectivo, color: "#16a34a" },
                { label: "🏦 Transferencia", value: totales?.ingresoTransferencia, color: "#2563eb" },
                { label: "💳 Tarjeta", value: totales?.ingresoTarjeta, color: "#d97706" },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 0", borderBottom: i < 2 ? "1px solid #f5f5f5" : "none"
                }}>
                  <span style={{ fontSize: 14, color: "#374151" }}>{row.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: row.color }}>
                    {formatCurrency(Number(row.value) || 0)}
                  </span>
                </div>
              ))}
              <div style={{
                marginTop: 14, paddingTop: 14, borderTop: "1px solid #e0e0e8",
                display: "flex", justifyContent: "space-between"
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0f0f0f" }}>Total</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#16a34a" }}>{formatCurrency(totalIngresos)}</span>
              </div>
              {/* Detalle clientes */}
              {clientes.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
                  <p style={{
                    fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase",
                    letterSpacing: "0.06em", marginBottom: 10
                  }}>Detalle de clientes</p>
                  {clientes.map((c, i) => {
                    const esParcial = c.formaPago && (c as any).estado === "pendiente_pago";
                    return (
                      <div key={c.id} style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", padding: "8px 0",
                        borderBottom: i < clientes.length - 1 ? "1px solid #f9f9f9" : "none"
                      }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
                            {c.nombre} {c.apellidos}
                            {esParcial && (
                              <span style={{
                                marginLeft: 8, fontSize: 10, fontWeight: 700,
                                background: "#fef3c7", color: "#92400e", padding: "1px 6px",
                                borderRadius: 99
                              }}>parcial</span>
                            )}
                          </p>
                          <p style={{ fontSize: 11, color: "#9ca3af" }}>
                            {c.agente?.name || "—"} · {c.paquete?.nombre || "—"}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontWeight: 700, color: esParcial ? "#d97706" : "#16a34a", fontSize: 13 }}>
                            {formatCurrency(Number(c.montoPagado) || 0)}
                          </p>
                          <p style={{ fontSize: 11, color: "#9ca3af", textTransform: "capitalize" }}>
                            {c.formaPago || "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Gastos */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{
                fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 16, color: "#0f0f0f",
                marginBottom: 18, display: "flex", alignItems: "center", gap: 8
              }}>
                <span style={{ width: 3, height: 18, background: "#cc1111", borderRadius: 4, display: "block" }} />
                Gastos del día
              </h3>
              {gastos.length === 0 ? (
                <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>
                  Sin gastos registrados
                </p>
              ) : (
                <>
                  {gastos.map((g, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", padding: "10px 0",
                      borderBottom: i < gastos.length - 1 ? "1px solid #f5f5f5" : "none"
                    }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
                          {g.label}{g.referencia && ` — ${g.referencia}`}
                        </p>
                        <p style={{ fontSize: 11, color: "#9ca3af", textTransform: "capitalize" }}>{g.formaPago}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, color: "#cc1111" }}>{formatCurrency(Number(g.monto))}</span>
                        {!cerrado && (
                          <button onClick={() => eliminarGasto(i)}
                            style={{
                              background: "none", border: "none", color: "#9ca3af",
                              cursor: "pointer", fontSize: 16, lineHeight: 1
                            }}>✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div style={{
                    marginTop: 12, paddingTop: 12, borderTop: "1px solid #e0e0e8",
                    display: "flex", justifyContent: "space-between"
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Total gastos</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#cc1111" }}>{formatCurrency(totalGastos)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Añadir gasto */}
          {!cerrado && (
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{
                fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 16, color: "#0f0f0f",
                marginBottom: 18, display: "flex", alignItems: "center", gap: 8
              }}>
                <span style={{ width: 3, height: 18, background: "#d97706", borderRadius: 4, display: "block" }} />
                Añadir gasto
                <span style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", marginLeft: 4 }}>
                  (se guarda automáticamente)
                </span>
              </h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {GASTOS_FIJOS.map(g => (
                  <button key={g.tipo} onClick={() => { setTipoGasto(g.tipo); setRefGasto(""); }}
                    style={{
                      padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                      fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
                      background: tipoGasto === g.tipo ? "#cc1111" : "white",
                      color: tipoGasto === g.tipo ? "white" : "#374151",
                      border: tipoGasto === g.tipo ? "2px solid #cc1111" : "2px solid #e0e0e8"
                    }}>
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="gasto-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px 140px", gap: 10, alignItems: "end" }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                    {gastoFijoActual.campo}{tipoGasto !== "otro" && " *"}
                  </label>
                  <input value={refGasto} onChange={e => setRefGasto(e.target.value)}
                    placeholder={gastoFijoActual.placeholder} className="input-field" style={{ fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Monto *</label>
                  <input type="number" step="0.01" value={montoGasto} onChange={e => setMontoGasto(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && agregarGasto()}
                    placeholder="0.00" className="input-field" style={{ fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Forma pago</label>
                  <select value={pagoGasto} onChange={e => setPagoGasto(e.target.value as FormaPago)}
                    className="input-field" style={{ fontSize: 13, cursor: "pointer" }}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transfer.</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                <button onClick={agregarGasto} className="btn-primary" style={{ padding: "10px 16px", fontSize: 13 }}>
                  + Añadir
                </button>
              </div>
            </div>
          )}

          {/* Clientes del día */}
          {verClientes && clientes.length > 0 && (
            <div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0" }}>
                <h3 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 15, color: "#0f0f0f" }}>
                  Clientes del día
                </h3>
              </div>
              <table className="data-table">
                <thead><tr>
                  <th>Cliente</th><th>Paquete</th><th>Agente</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                  <th style={{ textAlign: "center" }}>Pago</th>
                </tr></thead>
                <tbody>
                  {clientes.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.nombre} {c.apellidos}</td>
                      <td style={{ fontSize: 13, color: "#9ca3af" }}>{c.paquete?.nombre || "—"}</td>
                      <td style={{ fontSize: 13 }}>{c.agente?.name || "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#16a34a" }}>
                        {formatCurrency(Number(c.montoPagado) || 0)}
                      </td>
                      <td style={{ textAlign: "center", fontSize: 13, textTransform: "capitalize" }}>
                        {c.formaPago || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notas */}
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{
              fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 15,
              color: "#0f0f0f", marginBottom: 12
            }}>Notas del cuadre</h3>
            {cerrado ? (
              <p style={{ fontSize: 14, color: "#374151" }}>{notas || "—"}</p>
            ) : (
              <textarea value={notas}
                onChange={e => setNotas(e.target.value)}
                onBlur={() => guardarEnBD(gastosRef.current, notasRef.current)}
                placeholder="Observaciones del día, incidencias..." rows={3}
                className="input-field" style={{ resize: "vertical" }} />
            )}
          </div>

          {/* Botones */}
          {!cerrado && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="grid-2">
              <button onClick={guardarBorrador} disabled={guardando} className="btn-secondary"
                style={{ padding: 14, fontSize: 14 }}>
                {guardando ? "Guardando..." : "💾 Guardar borrador"}
              </button>
              <button onClick={cerrarDia} disabled={guardando} className="btn-primary"
                style={{
                  padding: 14, fontSize: 14,
                  background: esPasado
                    ? "linear-gradient(135deg,#d97706,#f59e0b)"
                    : "linear-gradient(135deg,#16a34a,#22c55e)"
                }}>
                {esPasado ? "⚠️ Cerrar día anterior" : "✅ Cerrar día"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}