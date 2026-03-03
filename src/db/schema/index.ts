import {
  pgTable, text, timestamp, boolean, pgEnum,
  uuid, integer, decimal, json,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const rolEnum = pgEnum("rol", ["agente", "agente_senior", "administrador"]);

export const formaPagoEnum = pgEnum("forma_pago", [
  "transferencia", "tarjeta", "efectivo",
]);

export const estadoClienteEnum = pgEnum("estado_cliente", [
  "pendiente_pago",          // registrado, pendiente de pagar
  "pendiente_confirmacion",  // pagó, esperando confirmación del admin
  "pagado",                  // confirmado por admin
  "cancelado",               // tiene devolución
  // legacy (mantener compatibilidad)
  "pendiente", "pendiente_admin", "activo", "devuelto",
]);

export const estadoSolicitudEnum = pgEnum("estado_solicitud", [
  "pendiente", "aprobada", "rechazada",
]);

export const tipoServicioEnum = pgEnum("tipo_servicio", [
  "azafata", "documentacion_notaria", "seguro_viaje", "maleta_extra", "otro",
]);

export const tipoPagoEnum = pgEnum("tipo_pago", [
  "completo", "plazo",
]);

// ─── Tablas de Better Auth ────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  rol: rolEnum("rol").notNull().default("agente"),
  activo: boolean("activo").notNull().default(true),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Paquetes ─────────────────────────────────────────────────────────────────

export const paquete = pgTable("paquete", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  activo: boolean("activo").notNull().default(true),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
  creadoPor: text("creado_por").references(() => user.id),
});

// ─── Clientes ────────────────────────────────────────────────────────────────

export const cliente = pgTable("cliente", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Datos personales
  nombre: text("nombre").notNull(),
  apellidos: text("apellidos").notNull(),
  email: text("email"),
  telefono: text("telefono").notNull(),
  direccion: text("direccion"),
  nacionalidad: text("nacionalidad"),
  // Documento de identidad
  tipoDocumento: text("tipo_documento"),
  numeroDocumento: text("numero_documento"),
  imagenDocumento: text("imagen_documento"),
  // Paquete contratado
  paqueteId: uuid("paquete_id").references(() => paquete.id),
  destino: text("destino"),
  fechaSalida: timestamp("fecha_salida"),
  fechaRegreso: timestamp("fecha_regreso"),
  // Pago
  formaPago: formaPagoEnum("forma_pago"),
  tipoPago: tipoPagoEnum("tipo_pago").default("completo"),       // completo o plazo
  montoTotal: decimal("monto_total", { precision: 10, scale: 2 }), // precio total acordado
  montoPagado: decimal("monto_pagado", { precision: 10, scale: 2 }), // lo que ha pagado hasta ahora
  moneda: text("moneda").default("EUR"),
  // Estado del proceso
  estado: estadoClienteEnum("estado").notNull().default("pendiente"),
  notas: text("notas"),
  // Agente y admin
  historialEstados: json("historial_estados").$type<{ estado: string; nota?: string; comprobante?: string; fecha: string; adminId: string }[]>().default([]),
  agenteId: text("agente_id").notNull().references(() => user.id),
  adminId: text("admin_id").references(() => user.id),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
  actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
}, (t) => [
  { name: "cliente_agente_idx", columns: [t.agenteId] },
  { name: "cliente_estado_idx", columns: [t.estado] },
  { name: "cliente_creado_idx", columns: [t.creadoEn] },
  { name: "cliente_nombre_idx", columns: [t.nombre, t.apellidos] },
  { name: "cliente_documento_idx", columns: [t.numeroDocumento] },
]);

// ─── Plan de pagos ────────────────────────────────────────────────────────────

export const pagoCliente = pgTable("pago_cliente", {
  id: uuid("id").defaultRandom().primaryKey(),
  clienteId: uuid("cliente_id").notNull().references(() => cliente.id, { onDelete: "cascade" }),
  monto: decimal("monto", { precision: 10, scale: 2 }).notNull(),
  moneda: text("moneda").default("EUR"),
  formaPago: formaPagoEnum("forma_pago").notNull(),
  comprobante: text("comprobante"),    // ruta del archivo
  notas: text("notas"),
  registradoPor: text("registrado_por").references(() => user.id),
  confirmado: boolean("confirmado").notNull().default(false),
  confirmadoEn: timestamp("confirmado_en"),
  confirmadoPor: text("confirmado_por").references(() => user.id),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
}, (t) => [
  { name: "pago_cliente_idx", columns: [t.clienteId] },
  { name: "pago_fecha_idx", columns: [t.creadoEn] },
]);

// ─── Devoluciones ─────────────────────────────────────────────────────────────

export const devolucion = pgTable("devolucion", {
  id: uuid("id").defaultRandom().primaryKey(),
  clienteId: uuid("cliente_id").notNull().references(() => cliente.id, { onDelete: "cascade" }),
  monto: decimal("monto", { precision: 10, scale: 2 }).notNull(),
  moneda: text("moneda").default("EUR"),
  motivo: text("motivo").notNull(),
  comprobante: text("comprobante"),    // ruta del archivo
  procesadoPor: text("procesado_por").references(() => user.id),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

// ─── Documentos del cliente ───────────────────────────────────────────────────

export const documento = pgTable("documento", {
  id: uuid("id").defaultRandom().primaryKey(),
  clienteId: uuid("cliente_id").notNull().references(() => cliente.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  tipo: text("tipo").notNull(),
  rutaArchivo: text("ruta_archivo").notNull(),
  nombreOriginal: text("nombre_original").notNull(),
  mimeType: text("mime_type").notNull(),
  tamano: integer("tamano"),
  subidoPor: text("subido_por").references(() => user.id),
  subidoEn: timestamp("subido_en").notNull().defaultNow(),
});

// ─── Servicios especiales ─────────────────────────────────────────────────────

export const servicioEspecial = pgTable("servicio_especial", {
  id: uuid("id").defaultRandom().primaryKey(),
  clienteId: uuid("cliente_id").notNull().references(() => cliente.id, { onDelete: "cascade" }),
  tipoServicio: text("tipo_servicio").notNull(),
  descripcionServicio: text("descripcion_servicio"),
  monto: decimal("monto", { precision: 10, scale: 2 }),
  moneda: text("moneda").default("EUR"),
  justificacion: text("justificacion").notNull(),
  estado: estadoSolicitudEnum("estado").notNull().default("pendiente"),
  motivoRechazo: text("motivo_rechazo"),
  agenteId: text("agente_id").notNull().references(() => user.id),
  adminId: text("admin_id").references(() => user.id),
  revisadoEn: timestamp("revisado_en"),
  comprobantes: json("comprobantes").$type<string[]>().default([]),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
  actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
}, (t) => [
  { name: "servicio_agente_idx", columns: [t.agenteId] },
  { name: "servicio_estado_idx", columns: [t.estado] },
]);

// ─── Cuadre diario ────────────────────────────────────────────────────────────

export const cuadreDiario = pgTable("cuadre_diario", {
  id: uuid("id").defaultRandom().primaryKey(),
  fecha: timestamp("fecha").notNull(),
  ingresosEfectivo: decimal("ingresos_efectivo", { precision: 10, scale: 2 }).default("0"),
  ingresosTransferencia: decimal("ingresos_transferencia", { precision: 10, scale: 2 }).default("0"),
  ingresosTarjeta: decimal("ingresos_tarjeta", { precision: 10, scale: 2 }).default("0"),
  gastosEfectivo: decimal("gastos_efectivo", { precision: 10, scale: 2 }).default("0"),
  gastosTransferencia: decimal("gastos_transferencia", { precision: 10, scale: 2 }).default("0"),
  gastosTarjeta: decimal("gastos_tarjeta", { precision: 10, scale: 2 }).default("0"),
  notas: text("notas"),
  detalles: json("detalles").$type<CuadreDetalle[]>().default([]),
  cerrado: boolean("cerrado").notNull().default(false),
  cerradoEn: timestamp("cerrado_en"),
  adminId: text("admin_id").notNull().references(() => user.id),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
  actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
}, (t) => [
  { name: "cuadre_fecha_idx", columns: [t.fecha] },
  { name: "cuadre_cerrado_idx", columns: [t.cerrado] },
]);

// ─── Types ────────────────────────────────────────────────────────────────────

export type CuadreDetalle = {
  descripcion: string; monto: number;
  tipo: "ingreso" | "gasto"; formaPago: "efectivo" | "transferencia" | "tarjeta";
};

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Cliente = typeof cliente.$inferSelect;
export type NewCliente = typeof cliente.$inferInsert;
export type Paquete = typeof paquete.$inferSelect;
export type Documento = typeof documento.$inferSelect;
export type ServicioEspecial = typeof servicioEspecial.$inferSelect;
export type CuadreDiario = typeof cuadreDiario.$inferSelect;
export type PagoCliente = typeof pagoCliente.$inferSelect;
export type Devolucion = typeof devolucion.$inferSelect;



// ─── Catálogo de tipos de servicio especial ───────────────────────────────────

export const tipoServicio = pgTable("catalogo_servicio", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre").notNull(),
  icono: text("icono").notNull().default("⭐"),
  descripcion: text("descripcion"),
  precioBase: decimal("precio_base", { precision: 10, scale: 2 }),
  activo: boolean("activo").notNull().default(true),
  orden: integer("orden").notNull().default(0),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export type TipoServicio = typeof tipoServicio.$inferSelect;

// ─── Notificaciones ───────────────────────────────────────────────────────────

export const tipoNotificacionEnum = pgEnum("tipo_notificacion", [
  "cliente_nuevo",
  "pago_registrado",
  "servicio_solicitado",
  "servicio_aprobado",
  "servicio_rechazado",
  "cliente_confirmado",
  "estado_cliente",
  "cuadre_pendiente",
]);

export const notificacion = pgTable("notificacion", {
  id: uuid("id").defaultRandom().primaryKey(),
  tipo: tipoNotificacionEnum("tipo").notNull(),
  titulo: text("titulo").notNull(),
  mensaje: text("mensaje").notNull(),
  leida: boolean("leida").notNull().default(false),
  // A quién va dirigida (null = todos los admins)
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  // Solo admins, o solo el agente específico
  paraAdmin: boolean("para_admin").notNull().default(false),
  paraAgente: boolean("para_agente").notNull().default(false),
  // Referencia al recurso relacionado
  clienteId: uuid("cliente_id").references(() => cliente.id, { onDelete: "cascade" }),
  servicioId: uuid("servicio_id"),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
}, (t) => [
  { name: "notif_user_idx", columns: [t.userId] },
  { name: "notif_leida_idx", columns: [t.leida] },
  { name: "notif_creado_idx", columns: [t.creadoEn] },
]);

export type Notificacion = typeof notificacion.$inferSelect;

// ─── To Do List ───────────────────────────────────────────────────────────────

export const prioridadEnum = pgEnum("prioridad", ["baja", "media", "alta"]);

export const tarea = pgTable("tarea", {
  id: uuid("id").defaultRandom().primaryKey(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),
  completada: boolean("completada").notNull().default(false),
  prioridad: prioridadEnum("prioridad").notNull().default("media"),
  fechaLimite: timestamp("fecha_limite"),
  recordatorio: timestamp("recordatorio"),     // cuándo avisar
  recordatorioEnviado: boolean("recordatorio_enviado").notNull().default(false),
  // Dueño y asignación
  creadoPor: text("creado_por").notNull().references(() => user.id, { onDelete: "cascade" }),
  asignadoA: text("asignado_a").references(() => user.id, { onDelete: "set null" }),
  // Timestamps
  completadaEn: timestamp("completada_en"),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
  actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
}, (t) => [
  { name: "tarea_creado_por_idx", columns: [t.creadoPor] },
  { name: "tarea_asignado_a_idx", columns: [t.asignadoA] },
  { name: "tarea_completada_idx", columns: [t.completada] },
  { name: "tarea_fecha_limite_idx", columns: [t.fechaLimite] },
]);

export type Tarea = typeof tarea.$inferSelect;
// ─── Documentación ────────────────────────────────────────────────────────────

export const estadoDocSolicitudEnum = pgEnum("estado_doc_solicitud", [
  "solicitado", "enviado", "entregado", "pagado",
]);

export const docSolicitud = pgTable("doc_solicitud", {
  id: uuid("id").defaultRandom().primaryKey(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),
  estado: estadoDocSolicitudEnum("estado").notNull().default("solicitado"),
  creadoPor: text("creado_por").notNull().references(() => user.id),
  actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
}, (t) => [
  { name: "doc_solicitud_creado_idx", columns: [t.creadoPor] },
]);

export const docSolicitudHistorial = pgTable("doc_solicitud_historial", {
  id: uuid("id").defaultRandom().primaryKey(),
  solicitudId: uuid("solicitud_id").notNull().references(() => docSolicitud.id, { onDelete: "cascade" }),
  estadoAnterior: text("estado_anterior"),
  estadoNuevo: text("estado_nuevo").notNull(),
  nota: text("nota"),
  comprobante: text("comprobante"),
  creadoPor: text("creado_por").notNull().references(() => user.id),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
}, (t) => [
  { name: "doc_historial_solicitud_idx", columns: [t.solicitudId] },
]);

export type DocSolicitud = typeof docSolicitud.$inferSelect;
export type DocSolicitudHistorial = typeof docSolicitudHistorial.$inferSelect;