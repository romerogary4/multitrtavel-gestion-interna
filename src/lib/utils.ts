import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "EUR"
): string {
  if (amount === null || amount === undefined) return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(num);
}

export function formatDate(
  date: Date | string | null | undefined,
  formatStr: string = "dd/MM/yyyy"
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, formatStr, { locale: es });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, "dd/MM/yyyy HH:mm");
}

export const TIPO_SERVICIO_LABELS: Record<string, string> = {
  azafata: "Azafata",
  documentacion_notaria: "Documentación / Notaría",
  seguro_viaje: "Seguro de Viaje",
  maleta_extra: "Maleta Extra",
  otro: "Otro",
};

export const FORMA_PAGO_LABELS: Record<string, string> = {
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  efectivo: "Efectivo",
};

export const ESTADO_CLIENTE_LABELS: Record<string, string> = {
  pendiente_pago: "Pendiente de pago",
  pendiente_confirmacion: "Pendiente confirmación",
  pagado: "Pagado",
  cancelado: "Cancelado",
  // legacy
  pendiente: "Pendiente",
  pendiente_admin: "Pendiente Admin",
  activo: "Pagado",
  devuelto: "Cancelado",
};

export const ESTADO_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  pendiente_pago: { bg: "#fef3c7", color: "#92400e" },
  pendiente_confirmacion: { bg: "#ede9fe", color: "#5b21b6" },
  pagado: { bg: "#dcfce7", color: "#166534" },
  cancelado: { bg: "#f3f4f6", color: "#6b7280" },
  // legacy
  pendiente: { bg: "#fef3c7", color: "#92400e" },
  pendiente_admin: { bg: "#fee2e2", color: "#991b1b" },
  activo: { bg: "#dcfce7", color: "#166534" },
  devuelto: { bg: "#f3f4f6", color: "#6b7280" },
};

export const ESTADO_SOLICITUD_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export const ESTADO_COLORES: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  pendiente_admin: "bg-orange-100 text-orange-800",
  activo: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-red-100 text-red-800",
  aprobada: "bg-emerald-100 text-emerald-800",
  rechazada: "bg-red-100 text-red-800",
};
