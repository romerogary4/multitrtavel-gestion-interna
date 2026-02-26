"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import Link from "next/link";

interface Paquete { id: string; nombre: string; }
interface ClienteExistente { id: string; nombre: string; apellidos: string; email?: string; telefono: string; }

const PASOS = ["Datos personales", "Viaje", "Pago"];

export default function NuevoClientePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [paso, setPaso] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [clienteExistente, setClienteExistente] = useState<ClienteExistente | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ClienteExistente[]>([]);
  const [modoFrecuente, setModoFrecuente] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  const comprobanteRef = useRef<HTMLInputElement>(null);

  const esAdmin = (session?.user as any)?.rol === "administrador";

  const [form, setForm] = useState({
    nombre: "", apellidos: "", email: "", telefono: "", direccion: "",
    nacionalidad: "", tipoDocumento: "Pasaporte", numeroDocumento: "",
    imagenDocumento: null as File | null,
    paqueteId: "", destino: "", fechaSalida: "", fechaRegreso: "",
    tipoPago: "completo" as "completo" | "plazo",
    formaPago: "", montoTotal: "", montoPagado: "", moneda: "EUR", notas: "",
    comprobantePago: null as File | null,
  });

  useEffect(() => {
    fetch("/api/paquetes").then(r => r.json()).then(setPaquetes).catch(() => { });
  }, []);

  function up(field: string, value: any) { setForm(p => ({ ...p, [field]: value })); }

  // Búsqueda de cliente frecuente
  useEffect(() => {
    if (busquedaCliente.length < 2) { setResultadosBusqueda([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/clientes?busqueda=${busquedaCliente}&limite=5`);
      const d = await r.json();
      setResultadosBusqueda(d.clientes || []);
    }, 300);
    return () => clearTimeout(t);
  }, [busquedaCliente]);

  function seleccionarClienteFrecuente(c: ClienteExistente) {
    setClienteExistente(c);
    setForm(p => ({
      ...p, nombre: c.nombre, apellidos: c.apellidos,
      email: c.email || "", telefono: c.telefono,
    }));
    setResultadosBusqueda([]);
    setBusquedaCliente("");
    setPaso(1); // saltar directo al paso de viaje
  }

  function validarPaso(p: number) {
    if (p === 0) return !!(form.nombre && form.apellidos && form.telefono);
    if (p === 1) return !!(form.paqueteId && form.destino);
    if (p === 2) {
      if (!form.formaPago) return false;
      if (form.tipoPago === "completo") return !!form.montoPagado;
      return !!(form.montoTotal && form.montoPagado);
    }
    return true;
  }

  async function handleSubmit() {
    if (!validarPaso(2)) { toast.error("Completa todos los campos requeridos"); return; }
    if (form.fechaSalida && form.fechaRegreso && form.fechaRegreso <= form.fechaSalida) {
      toast.error("La fecha de regreso debe ser posterior a la fecha de salida");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      // Si es cliente frecuente, enviar id del existente para re-usar datos
      if (clienteExistente) fd.append("clienteExistenteId", clienteExistente.id);
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== "" && !(v instanceof File)) fd.append(k, String(v));
      });
      if (form.imagenDocumento) fd.append("imagenDocumento", form.imagenDocumento);
      if (form.comprobantePago) fd.append("comprobantePago", form.comprobantePago);

      const r = await fetch("/api/clientes", { method: "POST", body: fd });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      const nuevo = await r.json();
      toast.success("Cliente registrado correctamente");
      router.push(`/clientes/${nuevo.id}`);
    } catch (e: any) {
      toast.error(e.message || "Error al registrar cliente");
    } finally { setLoading(false); }
  }

  const pendientePago = form.tipoPago === "plazo" &&
    form.montoTotal && form.montoPagado &&
    Number(form.montoPagado) < Number(form.montoTotal);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/clientes" style={{
          fontSize: 13, color: "#9ca3af", textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12
        }}>
          ← Volver a clientes
        </Link>
        <h1 className="page-title" style={{ fontSize: 26 }}>
          {modoFrecuente ? "Cliente frecuente — nueva compra" : "Nuevo cliente"}
        </h1>
        <p style={{ fontSize: 14, color: "#9ca3af", marginTop: 4, marginLeft: 14 }}>
          Registrar nueva contratación
        </p>
      </div>

      {/* Toggle cliente nuevo / frecuente */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[
          { key: false, label: "🆕 Cliente nuevo" },
          { key: true, label: "🔄 Cliente frecuente" },
        ].map(opt => (
          <button key={String(opt.key)} onClick={() => {
            setModoFrecuente(opt.key as boolean);
            if (!opt.key) { setClienteExistente(null); setPaso(0); }
          }}
            style={{
              padding: "10px 20px", borderRadius: 12, fontFamily: "inherit",
              fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
              background: modoFrecuente === opt.key ? "#cc1111" : "white",
              color: modoFrecuente === opt.key ? "white" : "#374151",
              border: modoFrecuente === opt.key ? "2px solid #cc1111" : "2px solid #e0e0e8"
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Búsqueda cliente frecuente */}
      {modoFrecuente && !clienteExistente && (
        <div className="card" style={{ padding: 24, marginBottom: 24, position: "relative" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
            Buscar cliente existente
          </p>
          <input
            value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)}
            placeholder="Nombre, apellido, email o teléfono..."
            className="input-field" />
          {resultadosBusqueda.length > 0 && (
            <div style={{
              position: "absolute", left: 24, right: 24, zIndex: 50,
              background: "white", border: "1.5px solid #e0e0e8", borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)", overflow: "hidden", marginTop: 4
            }}>
              {resultadosBusqueda.map(c => (
                <button key={c.id} onClick={() => seleccionarClienteFrecuente(c)}
                  style={{
                    width: "100%", padding: "12px 16px", textAlign: "left",
                    background: "transparent", border: "none", cursor: "pointer",
                    borderBottom: "1px solid #f5f5f5", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 12
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fff8f8"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(135deg,#cc1111,#e52222)",
                    color: "white", display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 800, flexShrink: 0
                  }}>
                    {c.nombre.charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>
                      {c.nombre} {c.apellidos}
                    </p>
                    <p style={{ fontSize: 12, color: "#9ca3af" }}>{c.telefono}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cliente frecuente seleccionado */}
      {clienteExistente && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
          background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 14, marginBottom: 24
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "linear-gradient(135deg,#16a34a,#22c55e)",
            color: "white", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: 800, fontSize: 16
          }}>
            {clienteExistente.nombre.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, color: "#111" }}>
              {clienteExistente.nombre} {clienteExistente.apellidos}
            </p>
            <p style={{ fontSize: 12, color: "#16a34a" }}>✓ Cliente frecuente — nueva compra</p>
          </div>
          <button onClick={() => { setClienteExistente(null); setPaso(0); }}
            style={{
              fontSize: 12, color: "#9ca3af", background: "none", border: "none",
              cursor: "pointer", fontFamily: "inherit"
            }}>
            Cambiar
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
        {/* Formulario principal */}
        <div className="card" style={{ padding: 32 }}>
          {/* Stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
            {PASOS.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < PASOS.length - 1 ? 1 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700,
                    background: i < paso ? "#cc1111" : i === paso ? "#cc1111" : "#f0f0f0",
                    color: i <= paso ? "white" : "#9ca3af",
                    transition: "all 0.2s"
                  }}>
                    {i < paso ? "✓" : i + 1}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                    color: i === paso ? "#cc1111" : i < paso ? "#374151" : "#9ca3af"
                  }}>
                    {p}
                  </span>
                </div>
                {i < PASOS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: "0 8px", marginBottom: 20,
                    background: i < paso ? "#cc1111" : "#f0f0f0", transition: "background 0.3s"
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* PASO 1 — Datos personales */}
          {paso === 0 && !modoFrecuente && (
            <div>
              <h2 style={{
                fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 20,
                color: "#0f0f0f", marginBottom: 24
              }}>Datos personales</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Fld label="Nombre *">
                  <input value={form.nombre} onChange={e => up("nombre", e.target.value)}
                    placeholder="José" className="input-field" />
                </Fld>
                <Fld label="Apellidos *">
                  <input value={form.apellidos} onChange={e => up("apellidos", e.target.value)}
                    placeholder="García López" className="input-field" />
                </Fld>
                <Fld label="Teléfono *">
                  <input value={form.telefono} onChange={e => up("telefono", e.target.value)}
                    placeholder="+34 600 000 000" className="input-field" />
                </Fld>
                <Fld label="Email">
                  <input type="email" value={form.email} onChange={e => up("email", e.target.value)}
                    placeholder="cliente@email.com" className="input-field" />
                </Fld>
              </div>
              <div style={{ marginTop: 16 }}>
                <Fld label="Dirección">
                  <input value={form.direccion} onChange={e => up("direccion", e.target.value)}
                    placeholder="Calle, número, ciudad" className="input-field" />
                </Fld>
              </div>
              <div style={{ marginTop: 16 }}>
                <Fld label="Nacionalidad">
                  <input value={form.nacionalidad} onChange={e => up("nacionalidad", e.target.value)}
                    placeholder="Guatemalteca, Española..." className="input-field" />
                </Fld>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <Fld label="Tipo de documento">
                  <select value={form.tipoDocumento} onChange={e => up("tipoDocumento", e.target.value)}
                    className="input-field" style={{ cursor: "pointer" }}>
                    {["Pasaporte", "NIE", "DNI", "Otros"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </Fld>
                <Fld label="Número de documento">
                  <input value={form.numeroDocumento} onChange={e => up("numeroDocumento", e.target.value)}
                    placeholder="AB123456" className="input-field" />
                </Fld>
              </div>
              {/* Upload documento */}
              <div style={{ marginTop: 16 }}>
                <Fld label="Imagen del documento">
                  <div onClick={() => docInputRef.current?.click()}
                    style={{
                      border: "2px dashed #e0e0e8", borderRadius: 14, padding: "20px 24px",
                      textAlign: "center", cursor: "pointer", transition: "all 0.15s",
                      background: form.imagenDocumento ? "#f0fdf4" : "white"
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#cc1111"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#e0e0e8"}>
                    <p style={{ fontSize: 28, marginBottom: 6 }}>
                      {form.imagenDocumento ? "✅" : "📷"}
                    </p>
                    <p style={{ fontSize: 13, color: form.imagenDocumento ? "#16a34a" : "#9ca3af", fontWeight: 500 }}>
                      {form.imagenDocumento ? form.imagenDocumento.name : "Clic para subir imagen (JPG, PNG, max 10MB)"}
                    </p>
                  </div>
                  <input ref={docInputRef} type="file" accept="image/*"
                    style={{ display: "none" }}
                    onChange={e => up("imagenDocumento", e.target.files?.[0] || null)} />
                </Fld>
              </div>
            </div>
          )}

          {/* PASO 1 en modo frecuente — solo mostrar info */}
          {paso === 0 && modoFrecuente && clienteExistente && (
            <div>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 20, color: "#0f0f0f", marginBottom: 24 }}>
                Datos del cliente
              </h2>
              <p style={{ color: "#9ca3af", fontSize: 14 }}>Datos cargados automáticamente del cliente frecuente. Pasa al siguiente paso para configurar el nuevo viaje.</p>
            </div>
          )}

          {/* PASO 2 — Viaje */}
          {paso === 1 && (
            <div>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 20, color: "#0f0f0f", marginBottom: 24 }}>
                Detalles del viaje
              </h2>
              <Fld label="Paquete *">
                <select value={form.paqueteId} onChange={e => up("paqueteId", e.target.value)}
                  className="input-field" style={{ cursor: "pointer" }}>
                  <option value="">Seleccionar paquete...</option>
                  {paquetes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Fld>
              <div style={{ marginTop: 16 }}>
                <Fld label="Destino *">
                  <input value={form.destino} onChange={e => up("destino", e.target.value)}
                    placeholder="Guatemala, El Salvador..." className="input-field" />
                </Fld>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <Fld label="Fecha de salida">
                  <input type="date" value={form.fechaSalida} onChange={e => up("fechaSalida", e.target.value)}
                    className="input-field" />
                </Fld>
                <Fld label="Fecha de regreso">
                  <input type="date" value={form.fechaRegreso} onChange={e => up("fechaRegreso", e.target.value)}
                    className="input-field" />
                </Fld>
              </div>
            </div>
          )}

          {/* PASO 3 — Pago */}
          {paso === 2 && (
            <div>
              <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 20, color: "#0f0f0f", marginBottom: 24 }}>
                Pago y documentación
              </h2>

              {/* Tipo de pago */}
              <Fld label="¿Cómo pagará el cliente? *">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { v: "completo", label: "💳 Pago completo", desc: "Abona todo en este momento" },
                    { v: "plazo", label: "📅 Plan de pagos", desc: "Pagará en varias cuotas" },
                  ].map(opt => (
                    <button key={opt.v} type="button" onClick={() => up("tipoPago", opt.v)}
                      style={{
                        padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                        fontFamily: "inherit", textAlign: "left", transition: "all 0.15s",
                        background: form.tipoPago === opt.v ? "#fff0f0" : "white",
                        border: form.tipoPago === opt.v ? "2px solid #cc1111" : "2px solid #e0e0e8"
                      }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: form.tipoPago === opt.v ? "#cc1111" : "#111" }}>
                        {opt.label}
                      </p>
                      <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </Fld>

              {/* Forma de pago */}
              <div style={{ marginTop: 20 }}>
                <Fld label="Forma de pago *">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                    {[
                      { v: "transferencia", label: "Transferencia", icon: "🏦" },
                      { v: "tarjeta", label: "Tarjeta", icon: "💳" },
                      { v: "efectivo", label: "Efectivo", icon: "💵" },
                    ].map(op => (
                      <button key={op.v} type="button"
                        onClick={() => up("formaPago", op.v)}
                        style={{
                          padding: "14px 12px", borderRadius: 14, cursor: "pointer",
                          fontFamily: "inherit", textAlign: "center", transition: "all 0.15s",
                          background: form.formaPago === op.v ? "#fff0f0" : "white",
                          border: form.formaPago === op.v ? "2px solid #cc1111" : "2px solid #e0e0e8"
                        }}>
                        <p style={{ fontSize: 24, marginBottom: 4 }}>{op.icon}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: form.formaPago === op.v ? "#cc1111" : "#374151" }}>
                          {op.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </Fld>
              </div>

              {/* Montos */}
              <div style={{ display: "grid", gridTemplateColumns: form.tipoPago === "plazo" ? "1fr 1fr 100px" : "1fr 100px", gap: 12, marginTop: 20 }}>
                {form.tipoPago === "plazo" && (
                  <Fld label="Precio total acordado *">
                    <input type="number" step="0.01" value={form.montoTotal}
                      onChange={e => up("montoTotal", e.target.value)}
                      placeholder="0.00" className="input-field" />
                  </Fld>
                )}
                <Fld label={form.tipoPago === "plazo" ? "Primer pago *" : "Monto pagado *"}>
                  <input type="number" step="0.01" value={form.montoPagado}
                    onChange={e => up("montoPagado", e.target.value)}
                    placeholder="0.00" className="input-field" />
                </Fld>
                <Fld label="Moneda">
                  <select value={form.moneda} onChange={e => up("moneda", e.target.value)}
                    className="input-field" style={{ cursor: "pointer" }}>
                    <option value="EUR">EUR €</option>
                    <option value="USD">USD $</option>
                    <option value="GTQ">GTQ</option>
                  </select>
                </Fld>
              </div>

              {/* Aviso plan de pagos */}
              {form.tipoPago === "plazo" && form.montoTotal && form.montoPagado && (
                <div style={{
                  marginTop: 12, padding: "12px 16px", borderRadius: 12,
                  background: "#fff7ed", border: "1px solid #fed7aa"
                }}>
                  <p style={{ fontSize: 13, color: "#c2410c", fontWeight: 600 }}>
                    💡 Pendiente: {form.moneda} {(Number(form.montoTotal) - Number(form.montoPagado)).toFixed(2)}
                  </p>
                  <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                    El cliente quedará en estado "Pendiente de pago" hasta completar el total.
                  </p>
                </div>
              )}

              {/* Comprobante */}
              <div style={{ marginTop: 20 }}>
                <Fld label="Comprobante de pago">
                  <div onClick={() => comprobanteRef.current?.click()}
                    style={{
                      border: "2px dashed #e0e0e8", borderRadius: 14, padding: "20px 24px",
                      textAlign: "center", cursor: "pointer", transition: "all 0.15s",
                      background: form.comprobantePago ? "#f0fdf4" : "white"
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#cc1111"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#e0e0e8"}>
                    <p style={{ fontSize: 28, marginBottom: 6 }}>{form.comprobantePago ? "✅" : "📄"}</p>
                    <p style={{ fontSize: 13, color: form.comprobantePago ? "#16a34a" : "#9ca3af", fontWeight: 500 }}>
                      {form.comprobantePago ? form.comprobantePago.name : "PDF, JPG, PNG — máx 10MB"}
                    </p>
                  </div>
                  <input ref={comprobanteRef} type="file" accept=".pdf,image/*"
                    style={{ display: "none" }}
                    onChange={e => up("comprobantePago", e.target.files?.[0] || null)} />
                </Fld>
              </div>

              {/* Notas */}
              <div style={{ marginTop: 16 }}>
                <Fld label="Notas adicionales">
                  <textarea value={form.notas} onChange={e => up("notas", e.target.value)}
                    placeholder="Observaciones, comentarios..." rows={3}
                    className="input-field" style={{ resize: "vertical" }} />
                </Fld>
              </div>
            </div>
          )}

          {/* Navegación */}
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: 32,
            paddingTop: 24, borderTop: "1px solid #f0f0f0"
          }}>
            <button type="button" onClick={() => setPaso(p => p - 1)} disabled={paso === 0}
              className="btn-secondary" style={{ opacity: paso === 0 ? 0.4 : 1 }}>
              ← Anterior
            </button>
            {paso < PASOS.length - 1 ? (
              <button type="button" onClick={() => {
                if (!validarPaso(paso)) { toast.error("Completa los campos obligatorios"); return; }
                setPaso(p => p + 1);
              }} className="btn-primary">
                Siguiente →
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary">
                {loading ? "Guardando..." : "✓ Registrar cliente"}
              </button>
            )}
          </div>
        </div>

        {/* Panel derecho — resumen */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{
              fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 15,
              color: "#0f0f0f", marginBottom: 16, display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ width: 3, height: 18, background: "#cc1111", borderRadius: 4, display: "block" }} />
              Resumen
            </h3>
            {[
              { label: "Cliente", value: form.nombre ? `${form.nombre} ${form.apellidos}` : "—" },
              { label: "Destino", value: form.destino || "—" },
              { label: "Paquete", value: paquetes.find(p => p.id === form.paqueteId)?.nombre || "—" },
              { label: "Tipo pago", value: form.tipoPago === "plazo" ? "Plan de pagos" : "Pago completo" },
              { label: form.tipoPago === "plazo" ? "Total acordado" : "Monto", value: form.montoPagado ? `${form.moneda} ${form.montoPagado}` : "—" },
            ].map((r, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                padding: "8px 0", borderBottom: i < 4 ? "1px solid #f5f5f5" : "none"
              }}>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111", maxWidth: 140, textAlign: "right" }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Aviso efectivo */}
          {form.formaPago === "efectivo" && (
            <div style={{
              padding: "14px 16px", borderRadius: 14,
              background: "#fff7ed", border: "1px solid #fed7aa"
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#c2410c" }}>⚠ Pago en efectivo</p>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                Quedará pendiente de aprobación del administrador.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 7 }}>
        {label}
      </label>
      {children}
    </div>
  );
}