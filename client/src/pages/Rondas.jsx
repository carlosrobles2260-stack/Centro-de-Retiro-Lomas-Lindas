import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import CrudModule from '../components/CrudModule.jsx';
import { Badge, fechaHora } from '../lib/format.jsx';
import { useAuth } from '../lib/auth.jsx';

const hoy = new Date().toISOString().slice(0, 10);

export default function Rondas() {
  const { usuario } = useAuth();
  const puedeConfig = usuario.rol === 'admin' || usuario.rol === 'administracion';

  const [meta, setMeta] = useState('0');
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaBorrador, setMetaBorrador] = useState('0');
  const [rondasHoy, setRondasHoy] = useState(null);

  const cargarResumen = useCallback(async () => {
    const cfg = await api.get('/configuracion').catch(() => ({}));
    const m = cfg.meta_rondas_turno ?? '0';
    setMeta(m);
    setMetaBorrador(m);
    const rondas = await api.get(`/rondas?fecha=${hoy}`).catch(() => []);
    setRondasHoy(rondas.length);
  }, []);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  async function guardarMeta() {
    await api.put('/configuracion', { meta_rondas_turno: metaBorrador });
    setMeta(metaBorrador);
    setEditandoMeta(false);
  }

  const metaNum = Number(meta) || 0;
  const hechas = rondasHoy ?? 0;
  const cumplido = metaNum > 0 && hechas >= metaNum;

  return (
    <div>
      {/* Resumen de cumplimiento del día */}
      <div className="card" style={{ marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Rondas de hoy</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{rondasHoy === null ? '…' : hechas}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Meta por turno</div>
            {editandoMeta ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <input type="number" min="0" value={metaBorrador} onChange={(e) => setMetaBorrador(e.target.value)} style={{ width: 80 }} />
                <button onClick={guardarMeta}>Guardar</button>
                <button className="secundario" onClick={() => { setMetaBorrador(meta); setEditandoMeta(false); }}>Cancelar</button>
              </div>
            ) : (
              <div style={{ fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                {metaNum}
                {puedeConfig && <button className="secundario" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setEditandoMeta(true)}>Cambiar</button>}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Cumplimiento</div>
            <div style={{ marginTop: 8 }}>
              {metaNum === 0
                ? <span style={{ color: 'var(--texto-suave)' }}>Sin meta definida</span>
                : <Badge estado={cumplido ? 'cerrado' : 'abierto'} />}
              {metaNum > 0 && <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--texto-suave)' }}>{cumplido ? 'Meta cumplida' : `Faltan ${Math.max(0, metaNum - hechas)}`}</span>}
            </div>
          </div>
        </div>
      </div>

      <CrudModule
        titulo="Rondas de vigilancia"
        descripcion="Registro de recorridos y puntos de control del personal de seguridad."
        endpoint="/rondas"
        onCambio={cargarResumen}
        columnas={[
          { key: 'fecha_hora', label: 'Fecha y hora', render: (f) => fechaHora(f.fecha_hora) },
          { key: 'punto_control', label: 'Punto de control' },
          { key: 'empleado_nombre', label: 'Guardia' },
          { key: 'estado', label: 'Estado', render: (f) => <Badge estado={f.estado} /> },
          { key: 'observaciones', label: 'Observaciones' },
        ]}
        campos={[
          { name: 'punto_control', label: 'Punto de control', requerido: true },
          { name: 'empleado_id', label: 'Guardia / empleado', type: 'select', fuente: '/empleados', labelKey: 'nombre' },
          {
            name: 'estado', label: 'Estado', type: 'select', defecto: 'normal',
            opciones: [
              { valor: 'normal', label: 'Normal (sin novedad)' },
              { valor: 'novedad', label: 'Con novedad' },
            ],
          },
          { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
        ]}
      />
    </div>
  );
}
