import { relations } from "drizzle-orm";
import { user, cliente, paquete, documento, servicioEspecial, cuadreDiario, pagoCliente, devolucion, notificacion, tarea, docSolicitud, docSolicitudHistorial, contabilidadCliente, validacionVuelos } from "./schema";

export const userRelations = relations(user, ({ many }) => ({
  clientesComoAgente: many(cliente, { relationName: "agente" }),
  clientesComoAdmin: many(cliente, { relationName: "admin" }),
  serviciosSolicitados: many(servicioEspecial, { relationName: "agente" }),
  serviciosRevisados: many(servicioEspecial, { relationName: "admin" }),
  cuadres: many(cuadreDiario),
  pagosRegistrados: many(pagoCliente),
}));

export const paqueteRelations = relations(paquete, ({ many }) => ({
  clientes: many(cliente),
}));

export const clienteRelations = relations(cliente, ({ one, many }) => ({
  paquete: one(paquete, { fields: [cliente.paqueteId], references: [paquete.id] }),
  agente: one(user, { fields: [cliente.agenteId], references: [user.id], relationName: "agente" }),
  admin: one(user, { fields: [cliente.adminId], references: [user.id], relationName: "admin" }),
  documentos: many(documento),
  serviciosEspeciales: many(servicioEspecial),
  pagos: many(pagoCliente),
  contabilidad: many(contabilidadCliente),
  validacionVuelos: many(validacionVuelos),
  devoluciones: many(devolucion),
}));

export const documentoRelations = relations(documento, ({ one }) => ({
  cliente: one(cliente, { fields: [documento.clienteId], references: [cliente.id] }),
  subidoPor: one(user, { fields: [documento.subidoPor], references: [user.id] }),
}));

export const servicioEspecialRelations = relations(servicioEspecial, ({ one }) => ({
  cliente: one(cliente, { fields: [servicioEspecial.clienteId], references: [cliente.id] }),
  agente: one(user, { fields: [servicioEspecial.agenteId], references: [user.id], relationName: "agente" }),
  admin: one(user, { fields: [servicioEspecial.adminId], references: [user.id], relationName: "admin" }),
}));

export const cuadreDiarioRelations = relations(cuadreDiario, ({ one }) => ({
  admin: one(user, { fields: [cuadreDiario.adminId], references: [user.id] }),
}));

export const pagoClienteRelations = relations(pagoCliente, ({ one }) => ({
  cliente: one(cliente, { fields: [pagoCliente.clienteId], references: [cliente.id] }),
  registradoPor: one(user, { fields: [pagoCliente.registradoPor], references: [user.id] }),
}));

export const devolucionRelations = relations(devolucion, ({ one }) => ({
  cliente: one(cliente, { fields: [devolucion.clienteId], references: [cliente.id] }),
  procesadoPor: one(user, { fields: [devolucion.procesadoPor], references: [user.id] }),
}));

export const notificacionRelations = relations(notificacion, ({ one }) => ({
  user: one(user, { fields: [notificacion.userId], references: [user.id] }),
  cliente: one(cliente, { fields: [notificacion.clienteId], references: [cliente.id] }),
}));

export const tareaRelations = relations(tarea, ({ one }) => ({
  creadoPor: one(user, { fields: [tarea.creadoPor], references: [user.id], relationName: "tareasCreadoras" }),
  asignadoA: one(user, { fields: [tarea.asignadoA], references: [user.id], relationName: "tareasAsignadas" }),
}));
export const docSolicitudRelations = relations(docSolicitud, ({ one, many }) => ({
  creadoPorUser: one(user, { fields: [docSolicitud.creadoPor], references: [user.id] }),
  historial: many(docSolicitudHistorial),
}));

export const docSolicitudHistorialRelations = relations(docSolicitudHistorial, ({ one }) => ({
  solicitud: one(docSolicitud, { fields: [docSolicitudHistorial.solicitudId], references: [docSolicitud.id] }),
  creadoPorUser: one(user, { fields: [docSolicitudHistorial.creadoPor], references: [user.id] }),
}));

export const contabilidadClienteRelations = relations(contabilidadCliente, ({ one }) => ({
  cliente: one(cliente, { fields: [contabilidadCliente.clienteId], references: [cliente.id] }),
  contabilizadoPorUser: one(user, { fields: [contabilidadCliente.contabilizadoPor], references: [user.id] }),
}));

export const validacionVuelosRelations = relations(validacionVuelos, ({ one }) => ({
  cliente: one(cliente, { fields: [validacionVuelos.clienteId], references: [cliente.id] }),
  actualizadoPorUser: one(user, { fields: [validacionVuelos.actualizadoPor], references: [user.id] }),
}));