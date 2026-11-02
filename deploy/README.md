# Auto-despliegue (el servidor se actualiza solo)

Con esto, el servidor revisa GitHub cada pocos minutos y, si hay cambios nuevos,
se actualiza y reconstruye **solo**. Así no hay que correr comandos a mano en
cada cambio.

## Opción A — Vigilante cada 10 segundos (recomendado, casi inmediato)

Revisa GitHub **cada 10 segundos** y despliega al instante. Se instala como
servicio del sistema (systemd), así arranca solo y sobrevive a reinicios.

Conéctate al servidor (`ssh root@LA_IP`) y pega este bloque **una vez**:

```
# Quita el cron viejo de 3 minutos si existía
crontab -l 2>/dev/null | grep -v autodeploy.sh | crontab -

chmod +x /opt/lomaslindas/deploy/autodeploy.sh /opt/lomaslindas/deploy/watch.sh
cp /opt/lomaslindas/deploy/lomas-autodeploy.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now lomas-autodeploy
echo "Vigilante de 10s activado."
```

Comprobar que corre y ver el registro en vivo:

```
systemctl status lomas-autodeploy --no-pager
tail -f /opt/autodeploy.log
```

> El intervalo se cambia en `lomas-autodeploy.service` (variable
> `DEPLOY_INTERVALO`, en segundos) y luego `systemctl daemon-reload &&
> systemctl restart lomas-autodeploy`.
>
> Nota: 10 s es el tiempo en **detectar** el commit nuevo. La reconstrucción de
> la imagen (`docker compose up --build`) tarda su propio tiempo (normalmente
> entre 20 y 60 s), así que el total deja de ser minutos y pasa a ~1 minuto o
> menos.

## Opción B — Cron cada 3 minutos (lo anterior)

Si prefieres algo más liviano y no te urgen los segundos:

```
chmod +x /opt/lomaslindas/deploy/autodeploy.sh
( crontab -l 2>/dev/null | grep -v autodeploy.sh ; echo "*/3 * * * * /opt/lomaslindas/deploy/autodeploy.sh" ) | crontab -
echo "Auto-despliegue (cron 3 min) activado."
```

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

- Vigilante (systemd): `systemctl disable --now lomas-autodeploy`
- Cron: `crontab -l | grep -v autodeploy.sh | crontab -`

## Notas

- Solo reconstruye cuando **hay cambios** nuevos; si no hay, no hace nada (no
  consume recursos).
- Las migraciones de la base de datos se aplican solas al arrancar; los datos
  no se pierden (viven en un volumen aparte).
- La rama que sigue es `ccr-ad5a08cf-4fdooo` (se puede cambiar con la variable
  `DEPLOY_BRANCH`).
