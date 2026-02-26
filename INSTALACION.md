# 🧳 MultiTravel Cherry Matute — Guía de Instalación Completa

## Stack utilizado
- **Next.js 15** + TypeScript (frontend + backend)
- **Drizzle ORM** + **Neon PostgreSQL** (base de datos serverless gratuita)
- **Better Auth** (autenticación)
- **Caddy** (reverse proxy + HTTPS automático)
- **Docker + Docker Compose** (contenedores)
- Archivos (imágenes/PDFs) guardados en el **VPS local**

---

## 1. Configurar Neon (Base de datos gratuita)

1. Ve a [neon.tech](https://neon.tech) y crea una cuenta gratuita
2. Crea un nuevo proyecto llamado `multitravel`
3. Copia la **Connection string** (DATABASE_URL)
4. Guarda la URL, la necesitarás en el paso 3

---

## 2. Preparar el VPS (Ubuntu 24.04 en Hostinger)

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Instalar Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy -y

# Crear directorios para archivos subidos
sudo mkdir -p /var/www/multitravel/uploads
sudo chown -R $USER:$USER /var/www/multitravel
```

---

## 3. Subir el proyecto al VPS

```bash
# Opción A: Clonar desde tu repositorio Git
git clone https://github.com/tu-usuario/multitravel .
cd multitravel

# Opción B: Subir archivos via SCP desde tu máquina local
scp -r ./multitravel usuario@tu-servidor-ip:/var/www/multitravel
```

---

## 4. Configurar variables de entorno

```bash
cd /var/www/multitravel

# Crear .env desde el ejemplo
cp .env.example .env
nano .env
```

Rellena el archivo `.env`:

```env
DATABASE_URL="postgresql://usuario:pass@ep-xxxx.neon.tech/multitravel?sslmode=require"
BETTER_AUTH_SECRET="genera-esto-con: openssl rand -base64 32"
BETTER_AUTH_URL="https://tu-dominio.com"
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"
UPLOAD_DIR="/var/www/multitravel/uploads"
NODE_ENV="production"
```

> **Generar BETTER_AUTH_SECRET:**
> ```bash
> openssl rand -base64 32
> ```

---

## 5. Aplicar migraciones de base de datos

```bash
cd /var/www/multitravel

# Instalar dependencias localmente (solo para migraciones)
npm install

# Generar y aplicar migraciones
npm run db:push
```

---

## 6. Crear el primer usuario administrador

```bash
npx tsx scripts/seed.ts
```

Esto crea:
- **Email:** admin@multitravel.es
- **Contraseña:** Admin1234!

> ⚠️ Cambia la contraseña después del primer login desde el panel.

---

## 7. Construir y lanzar con Docker

```bash
cd /var/www/multitravel

# Construir imagen
docker compose build

# Lanzar en background
docker compose up -d

# Verificar que corre
docker compose ps
docker compose logs -f app
```

La app estará disponible en `http://localhost:3000`

---

## 8. Configurar Caddy (HTTPS automático)

```bash
# Editar Caddyfile
sudo nano /etc/caddy/Caddyfile
```

Pega esto (reemplaza `tu-dominio.com` con tu dominio real):

```
tu-dominio.com {
    reverse_proxy localhost:3000
    encode gzip
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options SAMEORIGIN
        -Server
    }
}
```

```bash
# Recargar Caddy
sudo systemctl reload caddy

# Verificar estado
sudo systemctl status caddy
```

Caddy automáticamente obtendrá y renovará el certificado SSL de Let's Encrypt.

---

## 9. Apuntar el dominio

En el panel de tu dominio (DNS), crea un registro **A** apuntando a la IP de tu VPS:

```
Tipo: A
Nombre: @ (o tu subdominio)
Valor: IP_DE_TU_VPS
TTL: 3600
```

---

## 10. Verificar instalación

1. Abre `https://tu-dominio.com` en el navegador
2. Login con `admin@multitravel.es` / `Admin1234!`
3. Crea los paquetes de viaje desde el panel de Admin
4. Crea los agentes desde el panel de Admin
5. ¡Listo!

---

## Comandos útiles de mantenimiento

```bash
# Ver logs en tiempo real
docker compose logs -f app

# Reiniciar la app
docker compose restart app

# Actualizar después de cambios de código
git pull
docker compose build
docker compose up -d

# Backup de uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /var/www/multitravel/uploads

# Ver espacio usado por uploads
du -sh /var/www/multitravel/uploads
```

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Crear .env.local
cp .env.example .env.local
# Editar con tus credenciales de Neon y:
# BETTER_AUTH_URL=http://localhost:3000
# UPLOAD_DIR=./uploads

# Crear carpeta uploads local
mkdir -p uploads

# Aplicar migraciones
npm run db:push

# Crear admin
npx tsx scripts/seed.ts

# Ejecutar en desarrollo
npm run dev
```

---

## Estructura de archivos subidos en el VPS

```
/var/www/multitravel/uploads/
├── documentos/          ← Imágenes de pasaportes y DNIs
│   └── [uuid].jpg
├── clientes/
│   └── [cliente-id]/    ← Documentos por cliente
│       └── [uuid].pdf
└── servicios/
    └── [servicio-id]/   ← Comprobantes de servicios especiales
        └── [uuid].pdf
```

---

## Soporte y preguntas

Para cualquier duda sobre el código o la instalación, revisa los logs:
```bash
docker compose logs app --tail=50
```
