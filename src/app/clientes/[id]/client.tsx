"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency, formatDate, FORMA_PAGO_LABELS, ESTADO_CLIENTE_LABELS, TIPO_SERVICIO_LABELS, ESTADO_BADGE_STYLE } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { SolicitudServicioForm } from "@/components/forms/SolicitudServicioForm";

interface Pago { id: string; monto: string; moneda: string; formaPago: string; comprobante?: string; notas?: string; creadoEn: string; registradoPor?: { name: string }; }
interface Documento { id: string; nombre: string; tipo: string; rutaArchivo: string; nombreOriginal: string; mimeType: string; tamano?: number; subidoEn: string; }
interface Servicio { id: string; tipoServicio: string; descripcionServicio?: string; monto?: string; moneda: string; justificacion: string; estado: string; motivoRechazo?: string; comprobantes: string[]; creadoEn: string; agente?: { name: string }; admin?: { name: string }; }
interface Devolucion { id: string; monto: string; moneda: string; motivo: string; comprobante?: string; creadoEn: string; }

interface ClienteData {
  id: string; nombre: string; apellidos: string; email?: string; telefono: string;
  direccion?: string; nacionalidad?: string; tipoDocumento?: string; numeroDocumento?: string;
  imagenDocumento?: string; paquete?: { nombre: string }; destino?: string;
  fechaSalida?: string; fechaRegreso?: string; formaPago?: string; tipoPago?: string;
  montoTotal?: string; montoPagado?: string; moneda: string; estado: string; notas?: string;
  agente?: { id: string; name: string; email: string; image?: string };
  creadoEn: string; documentos: Documento[]; pagos: Pago[];
  devoluciones: Devolucion[]; serviciosEspeciales: Servicio[];
  historialEstados: { estadoAnterior: string; estadoNuevo: string; nota?: string; comprobante?: string; fecha: string; adminId: string; adminNombre: string }[];
}

// Use ESTADO_BADGE_STYLE from utils — no local override needed

export function ClienteDetailClient({ clienteData: initial, esAdmin, sessionUserId }: {
  clienteData: ClienteData; esAdmin: boolean; sessionUserId: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showEstadoModal, setShowEstadoModal] = useState(false);

  async function reloadData() {
    const r = await fetch(`/api/clientes/${data.id}?detalle=1`);
    if (r.ok) { const d = await r.json(); setData(d); }
    else router.refresh();
  }

  const pendiente = data.tipoPago === "plazo" && data.montoTotal
    ? Math.max(0, Number(data.montoTotal) - Number(data.montoPagado || 0))
    : 0;
  const progreso = data.montoTotal
    ? Math.min(100, (Number(data.montoPagado || 0) / Number(data.montoTotal)) * 100)
    : 100;

  const est = (ESTADO_BADGE_STYLE || {})[data.estado] || { bg: "#f3f4f6", color: "#6b7280" };

  function getFileUrl(ruta: string) {
    if (!ruta) return "";
    if (ruta.startsWith("http") || ruta.startsWith("/api")) return ruta;
    return `/api/files/${ruta}`;
  }

  async function aprobarEfectivo() {
    if (!confirm("¿Confirmar aprobación del pago en efectivo?")) return;
    const r = await fetch(`/api/clientes/${data.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "activo" }),
    });
    if (r.ok) { toast.success("Cliente activado"); reloadData(); }
  }

  async function cancelar() {
    if (!confirm("¿Cancelar este cliente?")) return;
    await fetch(`/api/clientes/${data.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "cancelado" }),
    });
    toast.success("Cliente cancelado"); reloadData();
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/clientes" style={{
          fontSize: 13, color: "#9ca3af", textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12
        }}>
          ← Clientes
        </Link>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16, flexShrink: 0,
              background: "linear-gradient(135deg,#cc1111,#e52222)", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-playfair)", fontWeight: 800, fontSize: 24
            }}>
              {data.nombre.charAt(0)}
            </div>
            <div>
              <h1 style={{
                fontFamily: "var(--font-playfair)", fontSize: 28, fontWeight: 800,
                color: "#0f0f0f", marginBottom: 6
              }}>
                {data.nombre} {data.apellidos}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                  background: est.bg, color: est.color
                }}>
                  {ESTADO_CLIENTE_LABELS[data.estado] || data.estado}
                </span>
                {data.agente && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Avatar name={data.agente.name} image={data.agente.image} size={32} />
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                      {data.agente.name} · {formatDate(data.creadoEn)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Acciones */}
          <div style={{ display: "flex", gap: 8 }}>
            {data.estado === "pendiente_pago" && (
              <button onClick={() => setShowPagoModal(true)} className="btn-primary"
                style={{ fontSize: 13 }}>
                + Registrar pago
              </button>
            )}
            {data.estado === "pendiente_admin" && esAdmin && (
              <button onClick={aprobarEfectivo} className="btn-primary" style={{ fontSize: 13 }}>
                ✓ Aprobar efectivo
              </button>
            )}
            {esAdmin && data.estado === "activo" && (
              <button onClick={() => setShowDevolucionModal(true)} className="btn-secondary"
                style={{ fontSize: 13, color: "#cc1111", borderColor: "#fca5a5" }}>
                ↩ Devolución
              </button>
            )}
            {esAdmin && (
              <button onClick={() => setShowEstadoModal(true)} className="btn-secondary"
                style={{ fontSize: 13, color: "#7c3aed", borderColor: "#c4b5fd" }}>
                🔄 Cambiar estado
              </button>
            )}
            {esAdmin && data.estado !== "cancelado" && data.estado !== "devuelto" && (
              <button onClick={cancelar} className="btn-secondary"
                style={{ fontSize: 13, color: "#6b7280" }}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
        {/* Columna principal */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Plan de pagos — si aplica */}
          {data.tipoPago === "plazo" && data.montoTotal && (
            <div className="card" style={{ padding: 24, borderTop: "3px solid #7c3aed" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 17, color: "#0f0f0f" }}>
                  📅 Plan de pagos
                </h2>
                {pendiente > 0 && (
                  <button onClick={() => setShowPagoModal(true)} className="btn-primary"
                    style={{ fontSize: 13, padding: "8px 16px" }}>
                    + Registrar cuota
                  </button>
                )}
              </div>
              {/* Barra de progreso */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>Progreso de pago</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>
                    {progreso.toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: 10, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${progreso}%`,
                    background: "linear-gradient(90deg,#7c3aed,#8b5cf6)", borderRadius: 99,
                    transition: "width 0.5s ease"
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>Pagado</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: "#16a34a" }}>
                      {formatCurrency(data.montoPagado || 0)}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>Pendiente</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: pendiente > 0 ? "#cc1111" : "#16a34a" }}>
                      {pendiente > 0 ? formatCurrency(pendiente) : "✓ Completado"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>Total acordado</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: "#0f0f0f" }}>
                      {formatCurrency(data.montoTotal)}
                    </p>
                  </div>
                </div>
              </div>
              {/* Historial de cuotas */}
              {data.pagos.length > 0 && (
                <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 14 }}>
                  <p style={{
                    fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase",
                    letterSpacing: "0.06em", marginBottom: 10
                  }}>Cuotas registradas</p>
                  {data.pagos.map((p, i) => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 0", borderBottom: i < data.pagos.length - 1 ? "1px solid #f9f9f9" : "none"
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, background: "#f0fdf4",
                        color: "#16a34a", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                          {formatCurrency(p.monto)}
                        </p>
                        <p style={{ fontSize: 12, color: "#9ca3af" }}>
                          {FORMA_PAGO_LABELS[p.formaPago] || p.formaPago} · {formatDate(p.creadoEn)}
                          {p.registradoPor && ` · ${p.registradoPor.name}`}
                        </p>
                      </div>
                      {p.comprobante && (
                        <button onClick={() => setLightbox(getFileUrl(p.comprobante!))}
                          style={{
                            fontSize: 12, color: "#cc1111", background: "#fff0f0",
                            border: "1px solid #fca5a5", borderRadius: 8, padding: "4px 10px",
                            cursor: "pointer", fontFamily: "inherit"
                          }}>
                          Ver 📎
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Datos personales */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{
              fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 17,
              color: "#0f0f0f", marginBottom: 20, display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ width: 3, height: 18, background: "#cc1111", borderRadius: 4, display: "block" }} />
              Datos personales
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 32px" }}>
              {[
                { label: "Teléfono", value: data.telefono },
                { label: "Email", value: data.email },
                { label: "Dirección", value: data.direccion },
                { label: "Nacionalidad", value: data.nacionalidad },
                { label: "Tipo documento", value: data.tipoDocumento },
                { label: "Nº documento", value: data.numeroDocumento },
              ].map((f, i) => f.value && (
                <div key={i}>
                  <p style={{
                    fontSize: 11, fontWeight: 700, color: "#9ca3af",
                    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4
                  }}>{f.label}</p>
                  <p style={{ fontSize: 14, color: "#111", fontWeight: 500 }}>{f.value}</p>
                </div>
              ))}
            </div>
            {data.imagenDocumento && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f5f5f5" }}>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: "#9ca3af",
                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10
                }}>
                  Imagen del documento
                </p>
                <div onClick={() => setLightbox(getFileUrl(data.imagenDocumento!))}
                  style={{
                    width: 120, height: 90, borderRadius: 12, overflow: "hidden",
                    cursor: "pointer", border: "2px solid #f0f0f0", transition: "all 0.2s",
                    position: "relative"
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#cc1111"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#f0f0f0"}>
                  <img src={getFileUrl(data.imagenDocumento)} alt="Documento"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 18, transition: "background 0.2s"
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.3)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0)"}>
                    🔍
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detalles del viaje */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{
              fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 17,
              color: "#0f0f0f", marginBottom: 20, display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ width: 3, height: 18, background: "#2563eb", borderRadius: 4, display: "block" }} />
              Detalles del viaje
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 32px" }}>
              {[
                { label: "Paquete", value: data.paquete?.nombre },
                { label: "Destino", value: data.destino },
                { label: "Fecha salida", value: formatDate(data.fechaSalida) },
                { label: "Fecha regreso", value: formatDate(data.fechaRegreso) },
              ].map((f, i) => (
                <div key={i}>
                  <p style={{
                    fontSize: 11, fontWeight: 700, color: "#9ca3af",
                    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4
                  }}>{f.label}</p>
                  <p style={{ fontSize: 14, color: "#111", fontWeight: 500 }}>{f.value || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Información de pago */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{
              fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 17,
              color: "#0f0f0f", marginBottom: 20, display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ width: 3, height: 18, background: "#16a34a", borderRadius: 4, display: "block" }} />
              Información de pago
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 32px" }}>
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: "#9ca3af",
                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4
                }}>Monto pagado</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#16a34a" }}>
                  {data.montoPagado ? formatCurrency(data.montoPagado, data.moneda) : "—"}
                </p>
              </div>
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: "#9ca3af",
                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4
                }}>Forma de pago</p>
                <p style={{ fontSize: 14, color: "#111", fontWeight: 500 }}>
                  {data.formaPago ? FORMA_PAGO_LABELS[data.formaPago] : "—"}
                </p>
              </div>
            </div>
            {data.notas && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f5f5f5" }}>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: "#9ca3af",
                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6
                }}>Notas</p>
                <p style={{ fontSize: 14, color: "#374151" }}>{data.notas}</p>
              </div>
            )}
          </div>

          {/* Comprobantes / Documentos */}
          <DocumentosSection
            clienteId={data.id}
            documentos={data.documentos}
            pagos={data.tipoPago !== "plazo" ? data.pagos : []}
            onLightbox={setLightbox}
            getFileUrl={getFileUrl}
            esAdmin={esAdmin}
          />

          {/* Devoluciones */}
          {data.devoluciones.length > 0 && (
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{
                fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 17,
                color: "#0f0f0f", marginBottom: 16, display: "flex", alignItems: "center", gap: 8
              }}>
                <span style={{ width: 3, height: 18, background: "#6b7280", borderRadius: 4, display: "block" }} />
                Devoluciones
              </h2>
              {data.devoluciones.map(d => (
                <div key={d.id} style={{ padding: "14px 0", borderBottom: "1px solid #f5f5f5" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#cc1111" }}>
                      -{formatCurrency(d.monto, d.moneda)}
                    </p>
                    <p style={{ fontSize: 12, color: "#9ca3af" }}>{formatDate(d.creadoEn)}</p>
                  </div>
                  <p style={{ fontSize: 13, color: "#374151" }}>{d.motivo}</p>
                </div>
              ))}
            </div>
          )}

          {/* Historial de estados */}
          {data.historialEstados && data.historialEstados.length > 0 && (
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{
                fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 17,
                color: "#0f0f0f", marginBottom: 16, display: "flex", alignItems: "center", gap: 8
              }}>
                <span style={{ width: 3, height: 18, background: "#7c3aed", borderRadius: 4, display: "block" }} />
                Historial de estados
              </h2>
              {([...data.historialEstados].reverse()).map((h: any, i: number) => (
                <div key={i} style={{
                  display: "flex", gap: 12, padding: "12px 0",
                  borderBottom: i < data.historialEstados.length - 1 ? "1px solid #f5f5f5" : "none"
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, background: "#f5f3ff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, flexShrink: 0
                  }}>🔄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 12, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
                        background: "#f3f4f6", color: "#6b7280"
                      }}>
                        {ESTADO_CLIENTE_LABELS[h.estadoAnterior] || h.estadoAnterior}
                      </span>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>→</span>
                      <span style={{
                        fontSize: 12, padding: "2px 8px", borderRadius: 99, fontWeight: 700,
                        background: (ESTADO_BADGE_STYLE || {})[h.estadoNuevo]?.bg || "#f3f4f6",
                        color: (ESTADO_BADGE_STYLE || {})[h.estadoNuevo]?.color || "#6b7280"
                      }}>
                        {ESTADO_CLIENTE_LABELS[h.estadoNuevo] || h.estadoNuevo}
                      </span>
                    </div>
                    {h.nota && <p style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>{h.nota}</p>}
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>
                      {h.adminNombre} · {formatDate(h.fecha)}
                    </p>
                  </div>
                  {h.comprobante && (
                    <button onClick={() => setLightbox(getFileUrl(h.comprobante))}
                      style={{
                        fontSize: 12, color: "#7c3aed", background: "#f5f3ff",
                        border: "1px solid #c4b5fd", borderRadius: 8, padding: "4px 10px",
                        cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start"
                      }}>
                      Ver 📎
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Servicios especiales */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0" }}>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 17, color: "#0f0f0f" }}>
                Servicios especiales
              </h2>
            </div>
            {data.serviciosEspeciales.length === 0 ? (
              <p style={{ padding: 24, color: "#9ca3af", fontSize: 14, textAlign: "center" }}>
                No hay servicios especiales solicitados
              </p>
            ) : data.serviciosEspeciales.map((s, si) => (
              <div key={s.id} style={{ padding: 20, borderBottom: "1px solid #f9f9f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>
                    {(TIPO_SERVICIO_LABELS as any)[s.tipoServicio] || s.tipoServicio}
                    {s.descripcionServicio && ` — ${s.descripcionServicio}`}
                  </p>
                  <span style={{
                    padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                    background: s.estado === "aprobada" ? "#dcfce7" : s.estado === "rechazada" ? "#fee2e2" : "#fef3c7",
                    color: s.estado === "aprobada" ? "#166534" : s.estado === "rechazada" ? "#991b1b" : "#92400e"
                  }}>
                    {s.estado === "aprobada" ? "Aprobada" : s.estado === "rechazada" ? "Rechazada" : "Pendiente"}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#9ca3af" }}>
                  {s.agente?.name} · {formatDate(s.creadoEn)}
                  {s.monto && ` · ${formatCurrency(s.monto)}`}
                </p>
                {s.comprobantes?.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {s.comprobantes.map((c, ci) => (
                      <div key={ci} onClick={() => setLightbox(getFileUrl(c))}
                        style={{
                          width: 64, height: 64, borderRadius: 10, overflow: "hidden",
                          border: "2px solid #f0f0f0", cursor: "pointer", transition: "all 0.2s"
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#cc1111"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#f0f0f0"}>
                        {c.endsWith(".pdf") ? (
                          <div style={{
                            width: "100%", height: "100%", background: "#f8f8f8",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
                          }}>📄</div>
                        ) : (
                          <img src={getFileUrl(c)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div style={{ padding: "16px 20px", borderTop: "1px solid #f0f0f0" }}>
              <SolicitudServicioForm clienteId={data.id} esAdmin={esAdmin} />
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Resumen */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{
              fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 16,
              color: "#0f0f0f", marginBottom: 20, display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ width: 3, height: 18, background: "#cc1111", borderRadius: 4, display: "block" }} />
              Resumen
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                {
                  label: "Estado", value: <span style={{
                    padding: "3px 10px", borderRadius: 99, fontSize: 12,
                    fontWeight: 700, background: est.bg, color: est.color
                  }}>
                    {ESTADO_CLIENTE_LABELS[data.estado] || data.estado}
                  </span>
                },
                {
                  label: "Total pagado", value: <span style={{ fontWeight: 800, fontSize: 16, color: "#16a34a" }}>
                    {formatCurrency(data.montoPagado || 0, data.moneda)}
                  </span>
                },
                ...(data.montoTotal ? [{
                  label: "Total acordado", value: <span style={{ fontWeight: 700, color: "#111" }}>
                    {formatCurrency(data.montoTotal, data.moneda)}
                  </span>
                }] : []),
                ...(pendiente > 0 ? [{
                  label: "Pendiente", value: <span style={{ fontWeight: 800, color: "#cc1111" }}>
                    {formatCurrency(pendiente, data.moneda)}
                  </span>
                }] : []),
                { label: "Paquete", value: <span style={{ fontSize: 13, color: "#374151" }}>{data.paquete?.nombre || "—"}</span> },
                { label: "Destino", value: <span style={{ fontSize: 13, color: "#374151" }}>{data.destino || "—"}</span> },
                { label: "Documentos", value: <span style={{ fontWeight: 600 }}>{data.documentos.length}</span> },
                { label: "Servicios extra", value: <span style={{ fontWeight: 600 }}>{data.serviciosEspeciales.length}</span> },
              ].map((row, i, arr) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid #f5f5f5" : "none"
                }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{row.label}</span>
                  {row.value}
                </div>
              ))}
            </div>
          </div>

          {/* Agente */}
          {data.agente && (
            <div className="card" style={{ padding: 20 }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12
              }}>Agente</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={data.agente.name} image={data.agente.image} size={52} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{data.agente.name}</p>
                  <p style={{ fontSize: 12, color: "#9ca3af" }}>{data.agente.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Registrar pago */}
      {showPagoModal && (
        <PagoModal
          clienteId={data.id}
          onClose={() => setShowPagoModal(false)}
          onSuccess={() => { setShowPagoModal(false); reloadData(); }}
        />
      )}

      {/* Modal: Devolución */}
      {showDevolucionModal && (
        <DevolucionModal
          clienteId={data.id}
          onClose={() => setShowDevolucionModal(false)}
          onSuccess={() => { setShowDevolucionModal(false); reloadData(); }}
        />
      )}

      {/* Modal: Cambiar estado */}
      {showEstadoModal && (
        <CambioEstadoModal
          clienteId={data.id}
          estadoActual={data.estado}
          onClose={() => setShowEstadoModal(false)}
          onSuccess={() => { setShowEstadoModal(false); reloadData(); }}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button onClick={() => setLightbox(null)}
              style={{
                position: "absolute", top: -44, right: 0, background: "none", border: "none",
                color: "white", fontSize: 30, cursor: "pointer", lineHeight: 1
              }}>✕</button>
            {lightbox.includes(".pdf") ? (
              <iframe src={lightbox} style={{ width: "80vw", height: "80vh", borderRadius: 12 }} />
            ) : (
              <img src={lightbox} style={{
                maxWidth: "85vw", maxHeight: "85vh",
                borderRadius: 16, boxShadow: "0 32px 80px rgba(0,0,0,0.6)"
              }} />
            )}
            <a href={lightbox} target="_blank" rel="noreferrer"
              style={{
                position: "absolute", bottom: -36, left: "50%", transform: "translateX(-50%)",
                fontSize: 12, color: "rgba(255,255,255,0.6)", textDecoration: "none"
              }}>
              ↗ Abrir en nueva pestaña
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sección documentos ──────────────────────────────────────────────────────
function DocumentosSection({ clienteId, documentos: inicial, pagos, onLightbox, getFileUrl, esAdmin }: {
  clienteId: string; documentos: Documento[]; pagos: Pago[];
  onLightbox: (url: string) => void; getFileUrl: (r: string) => string; esAdmin: boolean;
}) {
  const [docs, setDocs] = useState(inicial);
  const [uploading, setUploading] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("comprobante_pago");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData();
    fd.append("archivo", file);
    fd.append("nombre", nombre || file.name);
    fd.append("tipo", tipo);
    setUploading(true);
    const r = await fetch(`/api/clientes/${clienteId}/documentos`, { method: "POST", body: fd });
    if (r.ok) { const d = await r.json(); setDocs(prev => [d, ...prev]); setNombre(""); toast.success("Documento subido"); }
    else toast.error("Error al subir");
    setUploading(false); e.target.value = "";
  }

  async function eliminar(docId: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    await fetch(`/api/clientes/${clienteId}/documentos?docId=${docId}`, { method: "DELETE" });
    setDocs(prev => prev.filter(d => d.id !== docId));
    toast.success("Eliminado");
  }

  // Unir comprobantes de pagos de pago completo + documentos
  const comprobantes = pagos.filter(p => p.comprobante);
  const todosLosDocs = [...docs];

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{
        fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 17,
        color: "#0f0f0f", marginBottom: 20, display: "flex", alignItems: "center", gap: 8
      }}>
        <span style={{ width: 3, height: 18, background: "#d97706", borderRadius: 4, display: "block" }} />
        Documentos y comprobantes
      </h2>

      {/* Comprobantes de pago */}
      {comprobantes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: 12
          }}>Comprobantes de pago</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {comprobantes.map((p, i) => {
              const url = getFileUrl(p.comprobante!);
              const isPdf = p.comprobante!.endsWith(".pdf");
              return (
                <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div onClick={() => onLightbox(url)}
                    style={{
                      width: 90, height: 90, borderRadius: 14, overflow: "hidden",
                      border: "2px solid #f0f0f0", cursor: "pointer", transition: "all 0.2s",
                      background: isPdf ? "#f8f8f8" : "#000",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#cc1111"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#f0f0f0"}>
                    {isPdf
                      ? <div style={{ textAlign: "center" }}><p style={{ fontSize: 26 }}>📄</p><p style={{ fontSize: 10, color: "#9ca3af" }}>PDF</p></div>
                      : <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <p style={{
                    fontSize: 10, color: "#9ca3af", textAlign: "center", maxWidth: 90,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                  }}>
                    Cuota {i + 1}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documentos adjuntos */}
      {todosLosDocs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: 12
          }}>Documentos adjuntos</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todosLosDocs.map(doc => {
              const url = getFileUrl(doc.rutaArchivo);
              const isImg = doc.mimeType?.startsWith("image/");
              return (
                <div key={doc.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", background: "#f9f9f9", borderRadius: 12,
                  border: "1px solid #f0f0f0"
                }}>
                  <div onClick={() => onLightbox(url)}
                    style={{
                      width: 48, height: 48, borderRadius: 10, overflow: "hidden",
                      flexShrink: 0, cursor: "pointer", background: isImg ? "#000" : "#f0f0f0",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                    {isImg
                      ? <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 22 }}>📄</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontWeight: 600, fontSize: 13, color: "#111",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      {doc.nombre || doc.nombreOriginal}
                    </p>
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>
                      {doc.tipo === "comprobante_pago" ? "Comprobante de pago"
                        : doc.tipo === "documentacion" ? "Documentación"
                          : "Otro"} · {formatDate(doc.subidoEn)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={url} target="_blank" rel="noreferrer"
                      style={{
                        fontSize: 12, color: "#2563eb", background: "#eff6ff",
                        border: "1px solid #bfdbfe", borderRadius: 8, padding: "4px 10px",
                        textDecoration: "none"
                      }}>
                      Ver
                    </a>
                    {esAdmin && (
                      <button onClick={() => eliminar(doc.id)}
                        style={{
                          fontSize: 12, color: "#cc1111", background: "#fff0f0",
                          border: "1px solid #fca5a5", borderRadius: 8, padding: "4px 10px",
                          cursor: "pointer", fontFamily: "inherit"
                        }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload nuevo documento */}
      <div style={{
        borderTop: todosLosDocs.length > 0 || comprobantes.length > 0 ? "1px solid #f0f0f0" : "none",
        paddingTop: todosLosDocs.length > 0 || comprobantes.length > 0 ? 16 : 0
      }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
          + Subir nuevo documento
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Nombre del documento" className="input-field"
            style={{ flex: 1, minWidth: 160, fontSize: 13 }} />
          <select value={tipo} onChange={e => setTipo(e.target.value)}
            className="input-field" style={{ width: "auto", fontSize: 13, cursor: "pointer" }}>
            <option value="comprobante_pago">Comprobante de pago</option>
            <option value="documentacion">Documentación</option>
            <option value="otro">Otro</option>
          </select>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="btn-secondary" style={{ fontSize: 13, padding: "10px 14px" }}>
            {uploading ? "Subiendo..." : "📎 Adjuntar"}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,image/*"
            style={{ display: "none" }} onChange={handleUpload} />
        </div>
      </div>
    </div>
  );
}

// ── Modal: Registrar pago ───────────────────────────────────────────────────
function PagoModal({ clienteId, onClose, onSuccess }: { clienteId: string; onClose: () => void; onSuccess: () => void }) {
  const [monto, setMonto] = useState("");
  const [formaPago, setFormaPago] = useState("transferencia");
  const [notas, setNotas] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function guardar() {
    if (!monto || !formaPago) { toast.error("Indica el monto y la forma de pago"); return; }
    setLoading(true);
    const fd = new FormData();
    fd.append("clienteId", clienteId);
    fd.append("monto", monto);
    fd.append("formaPago", formaPago);
    if (notas) fd.append("notas", notas);
    if (comprobante) fd.append("comprobante", comprobante);
    const r = await fetch("/api/clientes/pagos", { method: "POST", body: fd });
    if (r.ok) { toast.success("Pago registrado ✓"); onSuccess(); }
    else toast.error("Error al registrar pago");
    setLoading(false);
  }

  return (
    <Modal title="Registrar cuota de pago" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Monto *</label>
          <input type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
            placeholder="0.00" className="input-field" />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Forma de pago *</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[{ v: "transferencia", l: "🏦 Transferencia" }, { v: "tarjeta", l: "💳 Tarjeta" }, { v: "efectivo", l: "💵 Efectivo" }].map(op => (
              <button key={op.v} onClick={() => setFormaPago(op.v)}
                style={{
                  padding: "10px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                  fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s", textAlign: "center",
                  background: formaPago === op.v ? "#fff0f0" : "white",
                  border: formaPago === op.v ? "2px solid #cc1111" : "2px solid #e0e0e8",
                  color: formaPago === op.v ? "#cc1111" : "#374151"
                }}>
                {op.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Comprobante</label>
          <div onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed #e0e0e8", borderRadius: 12, padding: "16px", textAlign: "center",
              cursor: "pointer", background: comprobante ? "#f0fdf4" : "white"
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#cc1111"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#e0e0e8"}>
            <p style={{ fontSize: 13, color: comprobante ? "#16a34a" : "#9ca3af" }}>
              {comprobante ? `✅ ${comprobante.name}` : "📎 Adjuntar comprobante (PDF o imagen)"}
            </p>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }}
            onChange={e => setComprobante(e.target.files?.[0] || null)} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Notas</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Observaciones..." rows={2} className="input-field" style={{ resize: "none" }} />
        </div>
        <button onClick={guardar} disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
          {loading ? "Guardando..." : "✓ Registrar pago"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal: Devolución ───────────────────────────────────────────────────────
function DevolucionModal({ clienteId, onClose, onSuccess }: { clienteId: string; onClose: () => void; onSuccess: () => void }) {
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function guardar() {
    if (!monto || !motivo) { toast.error("Indica el monto y el motivo"); return; }
    setLoading(true);
    const fd = new FormData();
    fd.append("clienteId", clienteId);
    fd.append("monto", monto);
    fd.append("motivo", motivo);
    if (comprobante) fd.append("comprobante", comprobante);
    const r = await fetch("/api/clientes/devoluciones", { method: "POST", body: fd });
    if (r.ok) { toast.success("Devolución registrada"); onSuccess(); }
    else { const e = await r.json(); toast.error(e.error || "Error"); }
    setLoading(false);
  }

  return (
    <Modal title="Registrar devolución" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: "12px 16px", background: "#fff7ed", borderRadius: 12, border: "1px solid #fed7aa" }}>
          <p style={{ fontSize: 13, color: "#c2410c", fontWeight: 600 }}>
            ⚠ Esta acción marcará el cliente como "Devuelto" y restará el monto de las estadísticas.
          </p>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Monto a devolver *</label>
          <input type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
            placeholder="0.00" className="input-field" />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Motivo *</label>
          <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder="Explica por qué se devuelve..." rows={3}
            className="input-field" style={{ resize: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Comprobante</label>
          <div onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed #e0e0e8", borderRadius: 12, padding: "14px", textAlign: "center",
              cursor: "pointer", background: comprobante ? "#f0fdf4" : "white"
            }}>
            <p style={{ fontSize: 13, color: comprobante ? "#16a34a" : "#9ca3af" }}>
              {comprobante ? `✅ ${comprobante.name}` : "📎 Adjuntar comprobante"}
            </p>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }}
            onChange={e => setComprobante(e.target.files?.[0] || null)} />
        </div>
        <button onClick={guardar} disabled={loading} className="btn-primary"
          style={{ background: "linear-gradient(135deg,#cc1111,#e52222)", marginTop: 4 }}>
          {loading ? "Procesando..." : "↩ Confirmar devolución"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal genérico ──────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 20, padding: 28, width: 480, maxWidth: "95vw",
          maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)"
        }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 18, color: "#0f0f0f" }}>
            {title}
          </h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 22,
            cursor: "pointer", color: "#9ca3af", lineHeight: 1
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Modal: Cambiar estado ───────────────────────────────────────────────────
function CambioEstadoModal({ clienteId, estadoActual, onClose, onSuccess }: {
  clienteId: string; estadoActual: string; onClose: () => void; onSuccess: () => void;
}) {
  const [estado, setEstado] = useState(estadoActual);
  const [nota, setNota] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ESTADOS = [
    { value: "pendiente_pago", label: "⏳ Pendiente de pago", bg: "#fef3c7", color: "#92400e" },
    { value: "pendiente_confirmacion", label: "🔔 Pendiente confirmación", bg: "#ede9fe", color: "#5b21b6" },
    { value: "pagado", label: "✅ Pagado", bg: "#dcfce7", color: "#166534" },
    { value: "cancelado", label: "❌ Cancelado", bg: "#f3f4f6", color: "#6b7280" },
  ];

  async function guardar() {
    if (estado === estadoActual) { toast.error("Selecciona un estado diferente"); return; }
    setLoading(true);
    const fd = new FormData();
    fd.append("clienteId", clienteId);
    fd.append("estado", estado);
    if (nota) fd.append("nota", nota);
    if (comprobante) fd.append("comprobante", comprobante);
    const r = await fetch("/api/clientes/estado", { method: "PATCH", body: fd });
    if (r.ok) { toast.success("Estado actualizado ✓"); onSuccess(); }
    else { const e = await r.json(); toast.error(e.error || "Error"); }
    setLoading(false);
  }

  return (
    <Modal title="Cambiar estado del cliente" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 10 }}>
            Nuevo estado
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ESTADOS.map(e => (
              <button key={e.value} onClick={() => setEstado(e.value)}
                style={{
                  padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                  fontFamily: "inherit", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  background: estado === e.value ? e.bg : "white",
                  border: estado === e.value ? `2px solid ${e.color}` : "2px solid #e0e0e8",
                  color: estado === e.value ? e.color : "#374151",
                  opacity: e.value === estadoActual ? 0.4 : 1
                }}
                disabled={e.value === estadoActual}>
                {e.label}
                {e.value === estadoActual && " (actual)"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Nota (opcional)
          </label>
          <textarea value={nota} onChange={e => setNota(e.target.value)}
            placeholder="Ej: Transferencia recibida el 20/02, ref. TRF-001..." rows={3}
            className="input-field" style={{ resize: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Comprobante (opcional)
          </label>
          <div onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed #e0e0e8", borderRadius: 12, padding: "14px",
              textAlign: "center", cursor: "pointer", background: comprobante ? "#f0fdf4" : "white"
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#7c3aed"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#e0e0e8"}>
            <p style={{ fontSize: 13, color: comprobante ? "#16a34a" : "#9ca3af" }}>
              {comprobante ? `✅ ${comprobante.name}` : "📎 Adjuntar comprobante"}
            </p>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }}
            onChange={e => setComprobante(e.target.files?.[0] || null)} />
        </div>
        <button onClick={guardar} disabled={loading} className="btn-primary"
          style={{ marginTop: 4, background: "linear-gradient(135deg,#7c3aed,#8b5cf6)" }}>
          {loading ? "Guardando..." : "✓ Confirmar cambio de estado"}
        </button>
      </div>
    </Modal>
  );
}