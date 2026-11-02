# Preferencias del proyecto

## Idioma
- **El idioma de este usuario es el español.** Responder y comunicarse siempre
  en español (incluyendo mensajes, explicaciones y resúmenes). El código,
  nombres de variables y mensajes de commit también se mantienen en español,
  como en el resto del proyecto.

## Contexto
- Proyecto: ERP del Centro de Retiro Lomas Lindas (gestión administrativa y de
  control de seguridad).
- Stack: Node.js + Express (SQLite/PostgreSQL) en el backend, React + Vite (PWA)
  en el frontend.
- Despliegue: VPS Contabo (13.140.236.51). Web en https://lomaslindas.duckdns.org
  (HTTPS con Caddy). Auto-despliegue cada 10s (systemd `lomas-autodeploy`) al
  hacer push a la rama; corre los seeds idempotentes.
- Correo: Brevo (SMTP), remitente único verificado = carlosrobles2260@gmail.com.

## Reglas de Oro (seguir siempre)
1. **Iniciativa primero.** Antes de pedirle al usuario que haga algo, investigar
   y resolverlo yo mismo si es posible (p. ej. capturar/leer datos del sistema,
   probar, deducir). Solo pedirle acción cuando de verdad es indispensable
   (credenciales que no tengo, decisiones de negocio, algo fuera de mi alcance).
   Siempre investigar y **recomendar** antes de delegar en el usuario.
2. **Propagar las mejoras.** Cuando corregimos o mejoramos un proceso en un
   módulo, revisar si ese mismo cambio aplica a **otros módulos** de la app y
   proponerlo/aplicarlo, para avanzar más rápido y mantener consistencia.
