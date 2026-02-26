import { db } from "@/db";
import { notificacion, user } from "@/db/schema";
import { eq } from "drizzle-orm";

type TipoNotif =
    | "cliente_nuevo"
    | "pago_registrado"
    | "servicio_solicitado"
    | "servicio_aprobado"
    | "servicio_rechazado"
    | "cliente_confirmado"
    | "estado_cliente"
    | "cuadre_pendiente";

interface CrearNotifOptions {
    tipo: TipoNotif;
    titulo: string;
    mensaje: string;
    paraAdmin?: boolean;       // notificar a todos los admins
    paraAgenteId?: string;     // notificar a un agente específico
    clienteId?: string;
    servicioId?: string;
}

// Crear notificación — si paraAdmin=true la crea una vez con userId=null
// Si paraAgenteId se especifica, crea una para ese agente
export async function crearNotificacion(opts: CrearNotifOptions) {
    try {
        const values: any[] = [];

        if (opts.paraAdmin) {
            // Una sola notificación para todos los admins (se filtra al leer)
            values.push({
                tipo: opts.tipo,
                titulo: opts.titulo,
                mensaje: opts.mensaje,
                paraAdmin: true,
                paraAgente: false,
                userId: null,
                clienteId: opts.clienteId || null,
                servicioId: opts.servicioId || null,
            });
        }

        if (opts.paraAgenteId) {
            values.push({
                tipo: opts.tipo,
                titulo: opts.titulo,
                mensaje: opts.mensaje,
                paraAdmin: false,
                paraAgente: true,
                userId: opts.paraAgenteId,
                clienteId: opts.clienteId || null,
                servicioId: opts.servicioId || null,
            });
        }

        if (values.length > 0) {
            await db.insert(notificacion).values(values);
        }
    } catch (e) {
        // No fallar si las notificaciones fallan
        console.error("Error creando notificación:", e);
    }
}