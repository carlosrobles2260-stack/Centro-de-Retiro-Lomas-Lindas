# Guía de despliegue en Contabo (VPS)

_Centro de Retiro Lomas Lindas · Puesta en línea del sistema_

Esta guía deja el ERP funcionando en internet, con dominio y HTTPS, sobre un VPS de Contabo. Está pensada para seguirse paso a paso. El sistema corre con **Docker Compose** (PostgreSQL + API Node + frontend nginx), así que no hay que instalar nada a mano aparte de Docker.

## 0. Lo que necesitas antes de empezar

- El **VPS creado** en Contabo (recomendado: 4 vCPU · 8 GB RAM · 200 GB SSD · región EE. UU. Este · Ubuntu 24.04 LTS).
- Los **datos de acceso** que Contabo envía por correo: la **IP del servidor**, el usuario (normalmente `root`) y la contraseña.
- Un **dominio** (por ejemplo `lomaslindas.com` o un subdominio como `sistema.lomaslindas.com`). Si aún no tienes, puede comprarse en Namecheap, GoDaddy, Cloudflare, etc.

> Si todavía no tienes dominio, el sistema igual funciona por la IP, pero **sin HTTPS**. Para producción conviene el dominio. Los pasos 7 y 8 son los del dominio.

## 1. Apuntar el dominio al servidor

En el panel de tu proveedor de dominio, crea un registro **A**:

- **Tipo:** A
- **Nombre:** `@` (o `sistema` si usarás `sistema.lomaslindas.com`)
- **Valor:** la **IP** de tu VPS de Contabo

Guarda. La propagación puede tardar de minutos a un par de horas. Puedes verificar con `ping tudominio.com` desde tu computadora.

## 2. Conectarte al servidor (SSH)

Desde tu computadora, abre una terminal (en Windows, usa **PowerShell** o **PuTTY**) y entra:

```
ssh root@LA_IP_DEL_SERVIDOR
```

Acepta la huella la primera vez y escribe la contraseña. Ya estás dentro del servidor.

**Recomendado (seguridad):** cambia la contraseña de root la primera vez con `passwd`.

## 3. Actualizar el sistema e instalar Docker

Copia y pega estos comandos uno por uno (o todos juntos):

```
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y git
```

Verifica que Docker quedó instalado:

```
docker --version
docker compose version
```

## 4. Abrir el cortafuegos (firewall)

Permitimos solo lo necesario: SSH y la web (HTTP/HTTPS).

```
apt install -y ufw
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

## 5. Descargar el proyecto

```
mkdir -p /opt && cd /opt
git clone https://github.com/carlosrobles2260-stack/Centro-de-Retiro-Lomas-Lindas.git lomaslindas
cd lomaslindas
```

> Si el repositorio es privado, Git pedirá usuario y token de GitHub, o sube el código por otro medio (por ejemplo `scp`).

## 6. Configurar las variables (.env)

Copia la plantilla y edítala:

```
cp .env.docker.example .env
nano .env
```

Ajusta estos valores (los demás puedes dejarlos):

- `POSTGRES_PASSWORD` → una **contraseña fuerte** para la base de datos.
- `JWT_SECRET` → un **secreto largo y aleatorio** (clave de seguridad de las sesiones). Puedes generar uno con:

```
openssl rand -base64 48
```

- `WEB_PORT` → déjalo en `8080` (quedará detrás del HTTPS).
- `CLIENT_ORIGIN` → la dirección pública final, por ejemplo `https://sistema.lomaslindas.com`.
- **Correo (opcional):** si quieres que las notificaciones y credenciales se envíen por email, completa `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM`. Si lo dejas vacío, el sistema funciona igual pero no envía correos.

Guarda en nano con **Ctrl+O, Enter** y sal con **Ctrl+X**.

## 7. Levantar el sistema

```
docker compose up -d --build
```

La primera vez tarda unos minutos (construye las imágenes). Cuando termine, carga los datos iniciales (usuarios de ejemplo y configuración):

```
docker compose exec server npm run seed
```

Comprueba que los tres servicios están arriba:

```
docker compose ps
```

En este punto el sistema responde en `http://LA_IP_DEL_SERVIDOR:8080` (si abres ese puerto temporalmente). Lo siguiente es ponerle el dominio con HTTPS.

## 8. Dominio con HTTPS (candado de seguridad)

Usaremos **Caddy**, que obtiene y renueva el certificado HTTPS automáticamente (Let's Encrypt), sin configurarlo a mano.

Instálalo:

```
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

Edita su configuración:

```
nano /etc/caddy/Caddyfile
```

Borra el contenido de ejemplo y deja solo esto (cambia el dominio por el tuyo):

```
sistema.lomaslindas.com {
    reverse_proxy localhost:8080
}
```

Guarda (Ctrl+O, Enter, Ctrl+X) y recarga Caddy:

```
systemctl reload caddy
```

Caddy pedirá el certificado solo. En un minuto, abre **https://sistema.lomaslindas.com** en el navegador: el sistema debe cargar con el candado de seguridad. ✅

> Importante: para que Caddy obtenga el certificado, el **paso 1 (dominio apuntando a la IP)** ya debe estar propagado.

## 9. Primer ingreso y seguridad

- Entra con el usuario administrador de ejemplo (`admin@lomaslindas.com` / `admin123`) y **cámbiale la contraseña de inmediato**. Crea los usuarios reales de administración, seguridad y presidencia, y borra o desactiva los de ejemplo.
- Carga los datos reales: propietarios, cuotas, personal, activos, normas y estatutos.
- Da de alta los accesos de los propietarios.

## 10. Copias de seguridad de la base de datos

La información (cuotas, nómina, votos) vive en la base de datos. Dos capas de respaldo:

1. **Auto Backup de Contabo** (si lo contrataste): respalda el disco completo del VPS. Es tu red de seguridad principal.
2. **Respaldo diario de la base**, recomendado además del anterior. Crea el script:

```
nano /opt/respaldo-db.sh
```

Pega esto:

```
#!/bin/bash
cd /opt/lomaslindas
mkdir -p /opt/backups
FECHA=$(date +%F-%H%M)
docker compose exec -T db pg_dump -U lomas lomaslindas | gzip > /opt/backups/lomaslindas-$FECHA.sql.gz
# Conserva solo los últimos 30 respaldos
ls -1t /opt/backups/*.sql.gz | tail -n +31 | xargs -r rm
```

Dale permisos y prográmalo todos los días a las 2:00 a.m.:

```
chmod +x /opt/respaldo-db.sh
( crontab -l 2>/dev/null; echo "0 2 * * * /opt/respaldo-db.sh" ) | crontab -
```

Para **restaurar** un respaldo (ejemplo):

```
gunzip -c /opt/backups/lomaslindas-FECHA.sql.gz | docker compose exec -T db psql -U lomas lomaslindas
```

> Consejo: de vez en cuando, descarga una copia de `/opt/backups` a otra ubicación (tu computadora o un almacenamiento aparte) con `scp`, para no depender solo del servidor.

## 11. Actualizar el sistema a una nueva versión

Cuando haya cambios nuevos en el código:

```
cd /opt/lomaslindas
git pull
docker compose up -d --build
```

Las migraciones de la base se aplican solas al arrancar. No se pierden los datos (viven en un volumen aparte).

## Comandos útiles del día a día

- Ver el estado: `docker compose ps`
- Ver los registros (logs) del API: `docker compose logs -f server`
- Reiniciar todo: `docker compose restart`
- Detener todo: `docker compose down` (los datos se conservan)

---

Ante cualquier duda durante la instalación, guarda el mensaje de error que aparezca; con eso se diagnostica rápido. Esta guía deja el sistema listo para toda la comunidad, con dominio, HTTPS y respaldos automáticos.
