import { useState } from 'react';

// Campo de contraseña con botón de ojo para mostrar/ocultar el texto.
// Reenvía todas las props al <input> (id, name, value, onChange, required, etc.).
export default function CampoPassword({ className, ...props }) {
  const [ver, setVer] = useState(false);
  const etiqueta = ver ? 'Ocultar contraseña' : 'Mostrar contraseña';
  return (
    <div className={`campo-password ${className || ''}`.trim()}>
      <input {...props} type={ver ? 'text' : 'password'} />
      <button
        type="button"
        className="ojo-password"
        onClick={() => setVer((v) => !v)}
        aria-label={etiqueta}
        title={etiqueta}
        tabIndex={-1}
      >
        {ver ? (
          // Ojo tachado (ocultar)
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          // Ojo (mostrar)
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
