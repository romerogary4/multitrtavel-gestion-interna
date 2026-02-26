"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  clienteId: string;
  estado: string;
  formaPago: string;
  esAdmin: boolean;
  inline?: boolean;
}

export function ClienteActions({ clienteId, estado, formaPago, esAdmin, inline }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function completarPagoEfectivo() {
    if (!confirm("¿Confirmar aprobación del pago en efectivo?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "activo" }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      toast.success("Pago en efectivo aprobado. Cliente activado.");
      router.refresh();
    } catch {
      toast.error("Error al procesar");
    } finally {
      setLoading(false);
    }
  }

  async function cancelarCliente() {
    if (!confirm("¿Estás seguro de cancelar este cliente?")) return;
    setLoading(true);
    try {
      await fetch(`/api/clientes/${clienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "cancelado" }),
      });
      toast.success("Cliente cancelado");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (inline) {
    return (
      <button
        onClick={completarPagoEfectivo}
        disabled={loading}
        className="px-4 py-2 rounded-lg text-sm font-600 text-white transition-all disabled:opacity-60"
        style={{ background: "#10b981" }}
      >
        {loading ? "Procesando..." : "✓ Aprobar pago efectivo"}
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      {esAdmin && estado === "pendiente_admin" && formaPago === "efectivo" && (
        <button
          onClick={completarPagoEfectivo}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl text-sm font-600 text-white transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: "#10b981" }}
        >
          ✓ Aprobar efectivo
        </button>
      )}
      {(estado === "pendiente" || estado === "pendiente_admin") && (
        <button
          onClick={cancelarCliente}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl text-sm font-600 text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
