import { useEffect, useState } from 'react';

// Muestra la credencial de un visitante con su código QR e imprime.
export default function Credencial({ visitante, onCerrar }) {
  const [qr, setQr] = useState(null);

  useEffect(() => {
    let activo = true;
    import('qrcode').then((QR) => {
      QR.toDataURL(visitante.codigo || '', { width: 240, margin: 1 }).then((url) => {
        if (activo) setQr(url);
      });
    });
    return () => { activo = false; };
  }, [visitante.codigo]);

  function imprimir() {
    const w = window.open('', '_blank', 'width=400,height=560');
    if (!w) return;
    w.document.write(`
      <html><head><title>Credencial ${visitante.nombre}</title>
      <style>
        body { font-family: system-ui, sans-serif; text-align:center; padding:24px; color:#1f2a24; }
        .carnet { border:2px solid #2f6e4f; border-radius:14px; padding:20px; max-width:300px; margin:0 auto; }
        h2 { color:#2f6e4f; margin:0 0 4px; font-size:16px; }
        .sub { font-size:12px; color:#5d6b63; margin-bottom:14px; }
        .nombre { font-size:18px; font-weight:700; margin:12px 0 2px; }
        .dato { font-size:13px; color:#5d6b63; }
        .codigo { margin-top:12px; font-family:monospace; font-size:15px; letter-spacing:1px; }
        img { margin-top:10px; }
      </style></head>
      <body><div class="carnet">
        <h2>Centro de Retiro Lomas Lindas</h2>
        <div class="sub">Credencial de visitante</div>
        <img src="${qr}" width="200" height="200" />
        <div class="nombre">${visitante.nombre}</div>
        <div class="dato">${visitante.tipo || ''} ${visitante.documento ? '· ' + visitante.documento : ''}</div>
        ${visitante.propietario_nombre ? `<div class="dato">Autoriza: ${visitante.propietario_nombre}</div>` : ''}
        <div class="codigo">${visitante.codigo || ''}</div>
      </div>
      <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `);
    w.document.close();
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, textAlign: 'center' }}>
        <h3>Credencial de visitante</h3>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{visitante.nombre}</div>
        <div className="descripcion" style={{ textTransform: 'capitalize' }}>
          {visitante.tipo} {visitante.documento ? `· ${visitante.documento}` : ''}
        </div>
        {qr ? (
          <img src={qr} alt="Código QR" style={{ width: 220, height: 220, margin: '12px auto' }} />
        ) : (
          <div className="cargando">Generando QR...</div>
        )}
        <div style={{ fontFamily: 'monospace', fontSize: 16, letterSpacing: 1 }}>{visitante.codigo}</div>
        <div className="pie-modal" style={{ justifyContent: 'center' }}>
          <button className="secundario" onClick={onCerrar}>Cerrar</button>
          <button onClick={imprimir} disabled={!qr}>Imprimir credencial</button>
        </div>
      </div>
    </div>
  );
}
