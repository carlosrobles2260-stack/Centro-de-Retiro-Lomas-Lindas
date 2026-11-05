import { useState } from 'react';

// Campo de contraseña con botón de ojo para mostrar/ocultar el texto.
// El recuadro y el ojo forman un solo campo; el ojo va DENTRO, a la derecha.
// Los estilos de posición van en línea para que siempre se apliquen (aunque el
// CSS externo esté cacheado). Reenvía las demás props al <input>.
export default function CampoPassword({ className, style, ...props }) {
  const [ver, setVer] = useState(false);
  const etiqueta = ver ? 'Ocultar contraseña' : 'Mostrar contraseña';

  const contenedor = {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--borde, #dfe4e0)',
    borderRadius: 8,
    background: '#fff',
  };
  const input = {
    flex: '1 1 auto',
    width: 'auto',
    minWidth: 0,
    border: 'none',
    background: 'transparent',
    boxShadow: 'none',
    ...style,
  };
  const boton = {
    flex: '0 0 auto',
    width: 42,
    height: 42,
    padding: 0,
    marginRight: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--texto-suave, #5d6b63)',
    cursor: 'pointer',
  };

  return (
    <div className={`campo-password ${className || ''}`.trim()} style={contenedor}>
      <input {...props} type={ver ? 'text' : 'password'} style={input} />
      <button type="button" className="ojo-password" onClick={() => setVer((v) => !v)} aria-label={etiqueta} title={etiqueta} tabIndex={-1} style={boton}>
        {ver ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
