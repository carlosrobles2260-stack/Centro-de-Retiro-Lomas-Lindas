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
