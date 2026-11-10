#!/bin/bash
# Vigilante de despliegue: revisa GitHub cada pocos segundos y despliega al
# instante cuando hay un commit nuevo. Reemplaza al cron de 3 minutos cuando se
# quiere una actualización casi inmediata.
#
# Intervalo (segundos), configurable con la variable DEPLOY_INTERVALO.
INTERVALO="${DEPLOY_INTERVALO:-10}"
SCRIPT="$(dirname "$0")/autodeploy.sh"

echo "$(date '+%F %T') Vigilante iniciado. Revisando cada ${INTERVALO}s." >> /opt/autodeploy.log

while true; do
  "$SCRIPT" || true   # autodeploy.sh ya maneja sus propios errores y el lock
  sleep "$INTERVALO"
done
