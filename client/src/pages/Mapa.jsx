import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

const EMOJI = { camion: '🚛', pickup: '🚙', patrulla: '🚓', moto: '🏍️', otro: '📍' };
const COLOR_GEO = { vertedero: '#c0392b', punto_control: '#2f6e4f', otro: '#8a6d3b' };

// Posición central aproximada de El Salvador si aún no hay datos.
const CENTRO_DEFECTO = [13.7, -89.2];

export default function Mapa() {
  const { usuario } = useAuth();
  const esAdmin = usuario.rol === 'admin' || usuario.rol === 'administracion';
  const puedeSimular = esAdmin || usuario.rol === 'seguridad';

  const contenedor = useRef(null);
  const mapa = useRef(null);
  const capaVehiculos = useRef(null);
  const capaGeocercas = useRef(null);
  const ajustado = useRef(false);

  const [datos, setDatos] = useState({ vehiculos: [], geocercas: [] });
  const [error, setError] = useState(null);
  const [actualizado, setActualizado] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const d = await api.get('/gps/posiciones');
      setDatos(d);
      setError(null);
      setActualizado(new Date());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    if (mapa.current || !contenedor.current) return;
    const m = L.map(contenedor.current).setView(CENTRO_DEFECTO, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(m);
    capaGeocercas.current = L.layerGroup().addTo(m);
    capaVehiculos.current = L.layerGroup().addTo(m);
    mapa.current = m;
    cargar();
    return () => { m.remove(); mapa.current = null; };
  }, [cargar]);

  // Refresca cada 15 segundos.
  useEffect(() => {
    const id = setInterval(cargar, 15000);
    return () => clearInterval(id);
  }, [cargar]);

  // Redibuja capas cuando cambian los datos.
  useEffect(() => {
    const m = mapa.current;
    if (!m || !capaVehiculos.current) return;

    capaGeocercas.current.clearLayers();
    capaVehiculos.current.clearLayers();
    const puntos = [];

    for (const g of datos.geocercas) {
      const color = COLOR_GEO[g.tipo] || COLOR_GEO.otro;
      L.circle([Number(g.lat), Number(g.lng)], {
        radius: Number(g.radio_m), color, fillColor: color, fillOpacity: 0.12, weight: 2,
      }).bindTooltip(g.nombre, { permanent: false }).addTo(capaGeocercas.current);
      puntos.push([Number(g.lat), Number(g.lng)]);
    }

    for (const v of datos.vehiculos) {
      if (v.lat == null || v.lng == null) continue;
      const icono = L.divIcon({
        className: 'veh-icono',
        html: `<div class="veh-pin">${EMOJI[v.tipo] || EMOJI.otro}</div>`,
        iconSize: [34, 34], iconAnchor: [17, 17],
      });
      const vel = v.velocidad != null ? `${v.velocidad} km/h` : 's/d';
      L.marker([v.lat, v.lng], { icon: icono })
        .bindPopup(`<b>${v.nombre}</b><br>${v.placa || ''}<br>Velocidad: ${vel}<br>Última señal: ${v.fecha_hora || 's/d'}`)
        .addTo(capaVehiculos.current);
      puntos.push([v.lat, v.lng]);
    }

    if (!ajustado.current && puntos.length > 0) {
      m.fitBounds(puntos, { padding: [40, 40], maxZoom: 16 });
      ajustado.current = true;
    }
  }, [datos]);

  const conSenal = datos.vehiculos.filter((v) => v.lat != null);
  const sinSenal = datos.vehiculos.filter((v) => v.lat == null);

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Mapa en tiempo real</h2>
          <p className="descripcion">
            Ubicación de los vehículos según su GPS. Se actualiza cada 15 segundos.
            {actualizado && ` Última actualización: ${actualizado.toLocaleTimeString('es-SV')}.`}
          </p>
        </div>
        <button className="secundario" onClick={cargar}>Actualizar</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="mapa-layout">
        <div ref={contenedor} className="mapa-lienzo" />
        <aside className="mapa-panel">
          <h3>Vehículos</h3>
          {datos.vehiculos.length === 0 && (
            <p className="descripcion">Aún no hay vehículos. Regístralos en «Vehículos».</p>
          )}
          {conSenal.map((v) => (
            <div key={v.id} className="veh-fila" onClick={() => enfocar(mapa, v)}>
              <span className="veh-emoji">{EMOJI[v.tipo] || EMOJI.otro}</span>
              <div>
                <strong>{v.nombre}</strong>
                <div className="veh-meta">
                  {v.velocidad != null ? `${v.velocidad} km/h` : 'detenido'} · {horaCorta(v.fecha_hora)}
                </div>
              </div>
            </div>
          ))}
          {sinSenal.length > 0 && (
            <>
              <div className="veh-sep">Sin señal</div>
              {sinSenal.map((v) => (
                <div key={v.id} className="veh-fila apagado">
                  <span className="veh-emoji">{EMOJI[v.tipo] || EMOJI.otro}</span>
                  <div><strong>{v.nombre}</strong><div className="veh-meta">Sin posición reportada</div></div>
                </div>
              ))}
            </>
          )}
        </aside>
      </div>

      {puedeSimular && <PanelSimular vehiculos={datos.vehiculos} geocercas={datos.geocercas} onEnviado={cargar} />}
      {esAdmin && <PanelWebhook />}
    </div>
  );
}

function enfocar(mapa, v) {
  if (v.lat != null && mapa.current) mapa.current.setView([v.lat, v.lng], 17);
}

function horaCorta(ts) {
  if (!ts) return 's/d';
  const parte = String(ts).slice(11, 16);
  return parte || ts;
}

// Herramienta de demostración/prueba: envía una posición simulada.
function PanelSimular({ vehiculos, geocercas, onEnviado }) {
  const [vehiculoId, setVehiculoId] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [velocidad, setVelocidad] = useState('');
  const [msg, setMsg] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await api.post('/gps/simular', {
        vehiculo_id: vehiculoId, lat: Number(lat), lng: Number(lng),
        velocidad: velocidad === '' ? null : Number(velocidad),
      });
      const ev = (r.eventos || []).map((x) => x.tipo).join(', ') || 'posición registrada';
      setMsg('✓ ' + ev);
      onEnviado();
    } catch (err) {
      setMsg('Error: ' + err.message);
    }
  }

  return (
    <form className="card simular" onSubmit={enviar}>
      <h3>Simular posición (prueba)</h3>
      <p className="descripcion">Envía una posición manual para probar el mapa y las geocercas sin un dispositivo real.</p>
      <div className="simular-fila">
        <select value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)} required>
          <option value="">Vehículo...</option>
          {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
        <input type="number" step="any" placeholder="Latitud" value={lat} onChange={(e) => setLat(e.target.value)} required />
        <input type="number" step="any" placeholder="Longitud" value={lng} onChange={(e) => setLng(e.target.value)} required />
        <input type="number" step="any" placeholder="km/h" value={velocidad} onChange={(e) => setVelocidad(e.target.value)} style={{ maxWidth: 90 }} />
        <button type="submit">Enviar</button>
      </div>
      {geocercas.length > 0 && (
        <div className="simular-atajos">
          <span>Usar coordenadas de:</span>
          {geocercas.map((g) => (
            <button type="button" key={g.id} className="secundario" onClick={() => { setLat(String(g.lat)); setLng(String(g.lng)); }}>
              {g.nombre}
            </button>
          ))}
        </div>
      )}
      {msg && <p className={msg.startsWith('Error') ? 'error' : 'ok-msg'}>{msg}</p>}
    </form>
  );
}

// Datos para conectar el proveedor de GPS (webhook + token).
function PanelWebhook() {
  const [info, setInfo] = useState(null);
  useEffect(() => { api.get('/gps/instrucciones').then(setInfo).catch(() => {}); }, []);
  if (!info) return null;
  const url = window.location.origin + info.ejemplo;
  return (
    <div className="card">
      <h3>Conectar el proveedor de GPS</h3>
      <p className="descripcion">
        Configura en la plataforma de tu rastreador un envío (webhook) por <b>POST</b> a esta dirección.
        El identificador del dispositivo debe coincidir con el «GPS (IMEI)» del vehículo.
      </p>
      <pre className="webhook-url">{url}</pre>
      <p className="descripcion">Cuerpo de ejemplo (JSON): <code>{JSON.stringify(info.cuerpo)}</code></p>
    </div>
  );
}
