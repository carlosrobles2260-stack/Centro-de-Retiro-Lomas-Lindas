#!/bin/bash
# Auto-despliegue del ERP Lomas Lindas.
# Revisa si hay cambios nuevos en GitHub y, si los hay, actualiza y reconstruye.
# Pensado para correr cada pocos minutos desde cron (ver deploy/README.md).
set -e

PROYECTO="/opt/lomaslindas"
RAMA="${DEPLOY_BRANCH:-ccr-ad5a08cf-4fdooo}"
LOG="/opt/autodeploy.log"

cd "$PROYECTO" || { echo "$(date '+%F %T') ERROR: no existe $PROYECTO" >> "$LOG"; exit 1; }

# Evita dos despliegues simultáneos.
exec 9>/tmp/autodeploy.lock
flock -n 9 || exit 0

git fetch --quiet origin "$RAMA" || { echo "$(date '+%F %T') ERROR: git fetch" >> "$LOG"; exit 1; }
LOCAL=$(git rev-parse HEAD)
REMOTO=$(git rev-parse "origin/$RAMA")

if [ "$LOCAL" = "$REMOTO" ]; then
  exit 0   # sin cambios, no hace nada
fi

echo "$(date '+%F %T') Cambios detectados ($LOCAL -> $REMOTO). Actualizando..." >> "$LOG"
git pull --quiet origin "$RAMA"
docker compose up -d --build >> "$LOG" 2>&1
echo "$(date '+%F %T') ✓ Desplegado $REMOTO" >> "$LOG"

# Seeds idempotentes: crean/actualizan cuentas base sin duplicar.
# Se corren en cada despliegue; si una cuenta ya existe, el seed la omite.
echo "$(date '+%F %T') Ejecutando seeds..." >> "$LOG"
sleep 8   # da tiempo a que el contenedor del servidor y la BD estén listos
for SEED in seed-directiva.js seed-practica-propietarios.js seed-galeria-directiva.js seed-fotos-directiva.js seed-bancos.js seed-propietarios-morosos.js seed-propietarios-datos.js seed-contenido-portal.js limpiar-datos-prueba.js forzar-cambio-password.js restablecer-admin.js seed-acceso-carlos.js; do
  if docker compose exec -T server node "src/$SEED" >> "$LOG" 2>&1; then
    echo "$(date '+%F %T')   ✓ seed $SEED" >> "$LOG"
  else
    echo "$(date '+%F %T')   ⚠ seed $SEED falló (reintenta en el próximo despliegue)" >> "$LOG"
  fi
done
echo "$(date '+%F %T') ✓ Despliegue completo" >> "$LOG"
