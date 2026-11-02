import { useRegisterSW } from 'virtual:pwa-register/react';

// Aviso de "nueva versión disponible" con un botón para actualizar, sin que el
// usuario tenga que forzar la recarga (Ctrl+F5). Revisa si hay versión nueva
// cada minuto y al volver a la app.
export default function ActualizarApp() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return;
      const revisar = () => { r.update().catch(() => {}); };
      setInterval(revisar, 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) revisar(); });
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="actualizar-barra" role="alert">
      <span>🔄 Hay una <strong>nueva versión</strong> del sistema.</span>
      <div className="actualizar-acc">
        <button type="button" className="secundario" onClick={() => setNeedRefresh(false)}>Ahora no</button>
        <button type="button" onClick={() => updateServiceWorker(true)}>Actualizar</button>
      </div>
    </div>
  );
}
