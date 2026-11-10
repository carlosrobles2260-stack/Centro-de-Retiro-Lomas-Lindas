import { useEffect, useState } from 'react';

// Muestra un botón para instalar la PWA cuando el navegador lo permite.
export default function InstalarApp() {
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt) return null;

  async function instalar() {
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }

  return (
    <button onClick={instalar} style={{ marginTop: 8 }}>
      📲 Instalar aplicación
    </button>
  );
}
