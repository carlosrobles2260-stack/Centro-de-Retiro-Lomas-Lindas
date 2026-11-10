# Activar HTTPS (candado) con DuckDNS — gratis

Con esto la app pasa de `http://13.140.236.51:8080` a `https://tu-nombre.duckdns.org`.
Es **necesario** para que funcione el aviso automático de "nueva versión" y para
poder instalar la app en el celular/PC.

## Paso 1 — Crear el subdominio gratis en DuckDNS (en tu navegador)

1. Entra a **https://www.duckdns.org** e inicia sesión (con Google, GitHub, etc.).
2. En **"sub domain"** escribe un nombre, por ejemplo: `lomaslindas`.
   Quedará: **`lomaslindas.duckdns.org`**.
3. Presiona **"add domain"**.
4. En la columna **"current ip"** de ese dominio, escribe la IP del servidor:
   **`13.140.236.51`** y presiona **"update ip"**.

> Listo: `lomaslindas.duckdns.org` ya apunta a tu servidor.

## Paso 2 — Abrir los puertos 80 y 443 en el servidor

El certificado y el HTTPS usan los puertos 80 y 443. Ábrelos en el firewall
(si usas `ufw`):

```bash
ufw allow 80
ufw allow 443
```

(Si no usas firewall de Contabo/ufw, igual asegúrate de que no estén bloqueados.)

## Paso 3 — Configurar el dominio en el proyecto

En el servidor, edita el archivo `.env` (en `/opt/lomaslindas/.env`) y agrega o
ajusta estas dos líneas con tu dominio:

```
SITE_DOMINIO=lomaslindas.duckdns.org
CLIENT_ORIGIN=https://lomaslindas.duckdns.org
```

Guarda y reconstruye:

```bash
cd /opt/lomaslindas
docker compose up -d --build
```

La primera vez, Caddy tarda ~30–60 s en obtener el certificado. Puedes ver el
progreso con:

```bash
docker compose logs -f caddy
```

Cuando veas que terminó, abre **https://lomaslindas.duckdns.org** — debe salir el
**candado** 🔒.

## Paso 4 — Comunicar la nueva dirección

- La app ahora se usa en **https://lomaslindas.duckdns.org** (en vez de la IP).
- Ya se puede **instalar como app** en el celular y la PC.
- El **aviso de nueva versión** aparecerá solo, sin Ctrl+F5.

> La dirección `http://13.140.236.51:8080` sigue existiendo como respaldo, pero
> para los propietarios comparte siempre la de **https://**.
