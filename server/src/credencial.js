import QRCode from 'qrcode';

// Genera el código QR como data URL (PNG en base64).
export function generarQrDataUrl(codigo) {
  return QRCode.toDataURL(codigo || '', { width: 300, margin: 1 });
}

// Genera el código QR como buffer PNG (para adjuntar en un correo).
export function generarQrBuffer(codigo) {
  return QRCode.toBuffer(codigo || '', { width: 300, margin: 1 });
}

// Página web pública de la credencial (para abrir desde un enlace / WhatsApp).
export function paginaCredencialHTML(v, qrDataUrl) {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Credencial · ${escape(v.nombre)}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #2f6e4f; margin: 0; padding: 24px;
    display: flex; min-height: 100vh; align-items: center; justify-content: center; }
  .carnet { background: #fff; border-radius: 18px; padding: 28px; max-width: 340px; width: 100%;
    text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,.25); }
  h1 { color: #2f6e4f; font-size: 18px; margin: 0 0 2px; }
  .sub { color: #5d6b63; font-size: 13px; margin-bottom: 18px; }
  .nombre { font-size: 22px; font-weight: 700; color: #1f2a24; margin: 14px 0 2px; }
  .dato { color: #5d6b63; font-size: 14px; }
  .codigo { font-family: monospace; font-size: 17px; letter-spacing: 1px; margin-top: 14px; color: #1f2a24; }
  img { width: 240px; height: 240px; }
</style></head>
<body><div class="carnet">
  <h1>Centro de Retiro Lomas Lindas</h1>
  <div class="sub">Credencial de visitante</div>
  <img src="${qrDataUrl}" alt="Código QR" />
  <div class="nombre">${escape(v.nombre)}</div>
  <div class="dato" style="text-transform:capitalize">${escape(v.tipo || '')}${v.documento ? ' · ' + escape(v.documento) : ''}</div>
  ${v.propietario_nombre ? `<div class="dato">Autoriza: ${escape(v.propietario_nombre)}</div>` : ''}
  <div class="codigo">${escape(v.codigo || '')}</div>
  <p class="dato" style="margin-top:18px;font-size:12px">Presenta este código en la entrada del centro.</p>
</div></body></html>`;
}

// Cuerpo HTML del correo con la credencial (el QR va como imagen adjunta cid:qr).
export function emailCredencialHTML(v, urlPublica) {
  return `<div style="font-family:system-ui,sans-serif;max-width:360px;margin:auto;text-align:center;border:1px solid #dfe4e0;border-radius:14px;padding:24px">
    <h2 style="color:#2f6e4f;margin:0 0 2px">Centro de Retiro Lomas Lindas</h2>
    <p style="color:#5d6b63;font-size:13px;margin:0 0 16px">Tu credencial de visitante</p>
    <img src="cid:qr" alt="Código QR" width="220" height="220" />
    <p style="font-size:20px;font-weight:700;color:#1f2a24;margin:12px 0 2px">${escape(v.nombre)}</p>
    <p style="color:#5d6b63;margin:0;text-transform:capitalize">${escape(v.tipo || '')}</p>
    <p style="font-family:monospace;font-size:16px;letter-spacing:1px;margin-top:12px">${escape(v.codigo || '')}</p>
    <p style="color:#5d6b63;font-size:13px;margin-top:16px">Presenta este código QR en la entrada del centro.</p>
    ${urlPublica ? `<p style="font-size:12px;margin-top:12px"><a href="${urlPublica}" style="color:#2f6e4f">Ver credencial en línea</a></p>` : ''}
  </div>`;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
