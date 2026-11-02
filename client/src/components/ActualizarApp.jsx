import { useRegisterSW } from 'virtual:pwa-register/react';

// Aviso de "nueva versión disponible" con un botón para actualizar, sin que el
// usuario tenga que forzar la recarga (Ctrl+F5). Revisa si hay versión nueva
// al abrir, cada minuto y al volver a la app.
export default function ActualizarApp() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return;

      // 1) Si ya hay una versión esperando (quedó lista con la app cerrada),
      //    mostrar el aviso de inmediato.
      if (r.waiting) setNeedRefresh(true);

      // 2) Cuando aparezca una nueva versión, avisar al quedar instalada.
      r.addEventListener('updatefound', () => {
        const nuevo = r.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedRefresh(true);
          }
        });
      });

      // 3) Revisar periódicamente y al volver a la app.
      const revisar = () => { r.update().catch(() => {}); };
      revisar();
      setInterval(revisar, 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) revisar(); });
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="actualizar-barra" role="alert">
      <span className="actualizar-icono" aria-hidden="true">↻</span>
      <div className="actualizar-texto">
        <strong>Hay una versión nueva del sistema</strong>
        <span>Recarga para tener las últimas funciones y correcciones.</span>
      </div>
      <div className="actualizar-acc">
        <button type="button" className="actualizar-ok" onClick={() => updateServiceWorker(true)}>Recargar ahora</button>
        <button type="button" className="actualizar-cerrar" aria-label="Cerrar" onClick={() => setNeedRefresh(false)}>✕</button>
      </div>
    </div>
  );
}
