"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface TipoServicio {
  id: string; nombre: string; icono: string;
  descripcion?: string; precioBase?: string;
}

interface Props { clienteId: string; esAdmin: boolean; }

export function SolicitudServicioForm({ clienteId, esAdmin }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tipos, setTipos] = useState<TipoServicio[]>([]);
  const [form, setForm] = useState({
    tipoServicioId: "",
    descripcionServicio: "",
    monto: "",
    justificacion: "",
  });

  useEffect(() => {
    if (open && tipos.length === 0) {
      fetch("/api/tipos-servicio")
        .then(r => r.json())
        .then(d => {
          const activos = d.filter((t: any) => t.activo !== false);
          setTipos(activos);
          if (activos.length > 0) setForm(f => ({ ...f, tipoServicioId: activos[0].id, monto: activos[0].precioBase || "" }));
        })
        .catch(() => toast.error("Error al cargar tipos de servicio"));
    }
  }, [open]);

  const tipoSeleccionado = tipos.find(t => t.id === form.tipoServicioId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tipoServicioId) { toast.error("Selecciona un tipo de servicio"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId,
          tipoServicioId: form.tipoServicioId,
          tipoServicio: tipoSeleccionado?.nombre || "otro",
          descripcionServicio: form.descripcionServicio || undefined,
          monto: form.monto || undefined,
          justificacion: form.justificacion || "Sin justificación",
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(esAdmin
        ? "Servicio añadido y aprobado automáticamente"
        : "Solicitud enviada. El administrador debe aprobarla."
      );
      setOpen(false);
      setForm({ tipoServicioId: tipos[0]?.id || "", descripcionServicio: "", monto: "", justificacion: "" });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error al enviar");
    } finally { setLoading(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "14px 18px", borderRadius: 14, border: "2px dashed #e0e0e8",
          background: "transparent", cursor: "pointer", transition: "all 0.2s", color: "#9ca3af"
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "#cc1111";
          (e.currentTarget as HTMLElement).style.color = "#cc1111";
          (e.currentTarget as HTMLElement).style.background = "#fff5f5";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "#e0e0e8";
          (e.currentTarget as HTMLElement).style.color = "#9ca3af";
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: "#f4f4f6",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0
        }}>⭐</div>
        <div style={{ textAlign: "left" }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: "inherit" }}>
            {esAdmin ? "Añadir servicio especial" : "Solicitar servicio especial"}
          </p>
          <p style={{ fontSize: 11, color: "#bbb", marginTop: 1 }}>
            {esAdmin ? "Se aprueba automáticamente" : "Requiere aprobación del administrador"}
          </p>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 20 }}>+</span>
      </button>
    );
  }

  return (
    <div style={{ background: "#fafafa", borderRadius: 16, border: "1px solid #f0f0f0", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg,#cc1111,#e53333)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
          }}>⭐</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#0f0f0f" }}>
              {esAdmin ? "Añadir servicio especial" : "Solicitar servicio especial"}
            </p>
            {esAdmin && <p style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✓ Se aprobará automáticamente</p>}
          </div>
        </div>
        <button onClick={() => setOpen(false)}
          style={{
            width: 28, height: 28, borderRadius: "50%", border: "none",
            background: "#f0f0f0", cursor: "pointer", fontSize: 14, color: "#666",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>✕</button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Selector de tipo */}
        <div style={{ marginBottom: 14 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: 8
          }}>Tipo de servicio</p>
          {tipos.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Cargando...</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {tipos.map(t => (
                <button key={t.id} type="button"
                  onClick={() => setForm({ ...form, tipoServicioId: t.id, monto: t.precioBase || "" })}
                  style={{
                    padding: "10px 8px", borderRadius: 10, border: "2px solid",
                    borderColor: form.tipoServicioId === t.id ? "#cc1111" : "#ebebeb",
                    background: form.tipoServicioId === t.id ? "#fff5f5" : "white",
                    cursor: "pointer", transition: "all 0.15s", textAlign: "center"
                  }}>
                  <div style={{ fontSize: 20, marginBottom: 3 }}>{t.icono}</div>
                  <p style={{
                    fontSize: 11, fontWeight: 600, lineHeight: 1.3,
                    color: form.tipoServicioId === t.id ? "#cc1111" : "#374151"
                  }}>{t.nombre}</p>
                  {t.precioBase && (
                    <p style={{ fontSize: 10, color: "#16a34a", marginTop: 2 }}>
                      {formatCurrency(Number(t.precioBase))}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Descripción adicional */}
        <div style={{ marginBottom: 12 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: 6
          }}>Detalle adicional (opcional)</p>
          <input type="text" value={form.descripcionServicio}
            onChange={e => setForm({ ...form, descripcionServicio: e.target.value })}
            placeholder="Especifica más detalles si es necesario..."
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 10,
              border: "1.5px solid #e0e0e8", fontSize: 13, outline: "none",
              fontFamily: "inherit", boxSizing: "border-box"
            }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: 6
          }}>Monto (€)</p>
          <input type="number" step="0.01" value={form.monto}
            onChange={e => setForm({ ...form, monto: e.target.value })}
            placeholder="0.00"
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 10,
              border: "1.5px solid #e0e0e8", fontSize: 13, outline: "none",
              fontFamily: "inherit", boxSizing: "border-box"
            }} />
          {tipoSeleccionado?.precioBase && (
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
              Precio base sugerido: {formatCurrency(Number(tipoSeleccionado.precioBase))}
            </p>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: 6
          }}>
            Justificación (opcional)
          </p>
          <textarea value={form.justificacion}
            onChange={e => setForm({ ...form, justificacion: e.target.value })}
            placeholder="Explica brevemente el motivo..." rows={3}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 10,
              border: "1.5px solid #e0e0e8", fontSize: 13, outline: "none",
              fontFamily: "inherit", resize: "none", boxSizing: "border-box"
            }} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={loading}
            style={{
              flex: 1, padding: "11px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#cc1111,#e53333)",
              color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
              opacity: loading ? 0.7 : 1
            }}>
            {loading ? "Enviando..." : esAdmin ? "✓ Añadir servicio" : "Enviar solicitud"}
          </button>
          <button type="button" onClick={() => setOpen(false)}
            style={{
              padding: "11px 16px", borderRadius: 10, border: "1.5px solid #e0e0e8",
              background: "white", fontSize: 13, color: "#666", cursor: "pointer"
            }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}