import { useEffect, useRef, useState } from 'react';

// Escáner de códigos QR usando la cámara del dispositivo.
// Llama a onDetectado(codigo) cuando lee un QR correctamente.
export default function EscanerQR({ onDetectado, onCerrar }) {
  const [error, setError] = useState(null);
  const contenedorId = useRef('qr-reader-' + Math.random().toString(36).slice(2));
  const scannerRef = useRef(null);

  useEffect(() => {
    let detenido = false;
    let instancia = null;

    import('html5-qrcode')
      .then(({ Html5Qrcode }) => {
        if (detenido) return;
        instancia = new Html5Qrcode(contenedorId.current);
        scannerRef.current = instancia;
        return instancia.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (texto) => {
            // Detener antes de notificar para no leer el mismo QR varias veces.
            instancia.stop().catch(() => {});
            onDetectado(texto.trim());
          },
          () => {} // errores por frame: se ignoran
        );
      })
      .catch((e) => setError('No se pudo iniciar la cámara: ' + e.message));

    return () => {
      detenido = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []); // eslint-disable-line

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, textAlign: 'center' }}>
        <h3>Escanear credencial</h3>
        <p className="descripcion">Apunta la cámara al código QR del visitante.</p>
        <div id={contenedorId.current} style={{ width: '100%', minHeight: 240, background: '#000', borderRadius: 10, overflow: 'hidden' }} />
        {error && <p className="error">{error}</p>}
        <div className="pie-modal" style={{ justifyContent: 'center' }}>
          <button className="secundario" onClick={onCerrar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
