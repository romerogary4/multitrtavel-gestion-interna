# 🧳 MultiTravel — Sistema de Gestión de Viajes

Sistema integral para la gestión de clientes, paquetes turísticos, pagos, cuadre diario y comunicación interna, diseñado específicamente para agencias de viajes.

## 🚀 Stack Tecnológico

- **Frontend & Backend:** [Next.js 15](https://nextjs.org/) (App Router) + TypeScript
- **Estilos:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Base de Datos:** [PostgreSQL](https://www.postgresql.org/) (vía [Neon](https://neon.tech/))
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Autenticación:** [Better Auth](https://www.better-auth.com/)
- **Infraestructura:** [Docker](https://www.docker.com/) + [Caddy](https://caddyserver.com/) (Reverse Proxy & SSL)

---

## 📂 Estructura del Proyecto

```text
src/
├── app/               # Rutas de la aplicación (Next.js App Router)
│   ├── admin/         # Panel de administración
│   ├── api/           # Endpoints de la API
│   ├── auth/          # Login y registro
│   ├── chat/          # Sistema de mensajería interna
│   ├── clientes/      # Gestión de clientes y reservas
│   ├── dashboard/     # Resumen general del sistema
│   └── reportes/      # Generación de reportes y estadísticas
├── components/        # Componentes UI (shadcn/ui, formularios, tablas)
├── db/                # Configuración de Drizzle y Schemas
├── hooks/             # Hooks personalizados de React
├── lib/               # Utilidades, auth-helpers y servicios
└── types/             # Definiciones de tipos globales
```

---

## 📊 Modelo de Datos (Esquema Principal)

El sistema utiliza **Drizzle ORM** con las siguientes entidades principales:

### Entidades de Usuario & Auth
- **User:** Gestiona perfiles de agentes y administradores (Roles: `agente`, `administrador`).
- **Session / Account:** Manejo de sesiones persistentes y autenticación segura.

### Gestión de Negocio
- **Paquete:** Catálogo de paquetes de viaje disponibles.
- **Cliente:** El núcleo del sistema. Almacena datos personales, documentos (DNI/Pasaporte), estado de pago y el agente asignado.
- **Documento:** Almacenamiento referenciado de archivos subidos (PDFs, imágenes).

### Finanzas
- **Pago Cliente:** Registro detallado de abonos (Efectivo, Transferencia, Tarjeta). Soporta pagos completos o a plazos.
- **Cuadre Diario:** Control financiero por fecha, separando ingresos y gastos por método de pago.
- **Devolución:** Gestión de reembolsos vinculados a clientes.

### Servicios & Comunicación
- **Servicio Especial:** Solicitudes de servicios adicionales (seguros, maletas extra) que requieren aprobación de administrador.
- **Conversación & Mensaje:** Sistema de chat interno para coordinación entre agentes y administración.

---

## ✨ Funcionalidades Clave

1.  **Gestión de Clientes Progresiva:** Seguimiento desde "Pendiente de Pago" hasta "Confirmado".
2.  **Control Financiero Estricto:** Cuadre de caja diario con detalles de ingresos y gastos.
3.  **Seguridad & Auditoría:** Middleware de protección de rutas, rate limiting en login y registro de historial en cambios de estado de clientes.
4.  **Gestión de Archivos:** Soporte para subida de documentos de identidad y comprobantes de pago.
5.  **Chat en Tiempo Real:** Comunicación centralizada dentro de la plataforma.

---

## 🛠️ Instalación y Despliegue

### Requisitos
- Node.js 20+
- Docker & Docker Compose
- Cuenta en Neon (o PostgreSQL nativo)

### Pasos rápidos
1. Clonar el repositorio.
2. Configurar el archivo `.env` basándose en `.env.example`.
3. Ejecutar `npm install`.
4. Sincronizar la base de datos: `npm run db:push`.
5. Ejecutar scripts de inicio: `npx tsx scripts/seed.ts`.
6. Lanzar con Docker: `docker compose up -d`.

*Para detalles específicos de despliegue en VPS, consultar [INSTALACION.md](file:///c:/Users/gary.romero/Desktop/Proyectos_Gary/multitravel/INSTALACION.md).*

---

## 📝 Notas de Desarrollo
- La aplicación utiliza un **Middleware** personalizado para la protección de rutas y seguridad (Headers HTTP, HSTS).
- El sistema de archivos local se mapea en Docker para persistencia de documentos en `/var/www/multitravel/uploads`.
