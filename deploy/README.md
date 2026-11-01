# Auto-despliegue (el servidor se actualiza solo)

Con esto, el servidor revisa GitHub cada pocos minutos y, si hay cambios nuevos,
se actualiza y reconstruye **solo**. Así no hay que correr comandos a mano en
cada cambio.

## Configuración (una sola vez, en el servidor)

Conéctate al servidor (`ssh root@LA_IP`) y pega este bloque **una vez**:

```
chmod +x /opt/lomaslindas/deploy/autodeploy.sh
# Revisa cada 3 minutos si hay cambios nuevos y despliega
( crontab -l 2>/dev/null | grep -v autodeploy.sh ; echo "*/3 * * * * /opt/lomaslindas/deploy/autodeploy.sh" ) | crontab -
echo "Auto-despliegue activado."
```

Listo. A partir de ahí, cada vez que se suban cambios al repositorio, el
servidor se actualiza solo en 2-3 minutos.

## Comprobar que funciona

- Ver el registro de despliegues:
  ```
  tail -f /opt/autodeploy.log
  ```
- Forzar un despliegue ahora mismo (sin esperar los 3 minutos):
  ```
  /opt/lomaslindas/deploy/autodeploy.sh
  ```

## Desactivar el auto-despliegue

```
crontab -l | grep -v autodeploy.sh | crontab -
```

## Notas

- Solo reconstruye cuando **hay cambios** nuevos; si no hay, no hace nada (no
  consume recursos).
- Las migraciones de la base de datos se aplican solas al arrancar; los datos
  no se pierden (viven en un volumen aparte).
- La rama que sigue es `ccr-ad5a08cf-4fdooo` (se puede cambiar con la variable
  `DEPLOY_BRANCH`).
