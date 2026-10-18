import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { dinero, fecha, Badge } from '../lib/format.jsx';

export default function Facturas() {
  const [filas, setFilas] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modalNueva, setModalNueva] = useState(false);
  const [modalPago, setModalPago] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const qs = filtroEstado ? `?estado=${filtroEstado}` : '';
    setFilas(await api.get('/facturas' + qs));
    setCargando(false);
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { api.get('/propietarios').then(setPropietarios).catch(() => {}); }, []);

  async function eliminar(f) {
    if (!confirm('¿Eliminar esta factura?')) return;
    await api.del(`/facturas/${f.id}`);
    cargar();
  }

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Facturas y cuotas</h2>
          <p className="descripcion">Cuotas de mantenimiento y cobros a los propietarios.</p>
        </div>
        <button onClick={() => setModalNueva(true)}>+ Nueva factura</button>
      </div>

      <div className="barra">
        <div className="filtros">
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Estado: todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagada">Pagada</option>
            <option value="vencida">Vencida</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
      </div>

      <div className="tabla-wrap">
        {cargando ? (
          <div className="cargando">Cargando...</div>
        ) : filas.length === 0 ? (
          <div className="vacio">No hay facturas registradas.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Propietario</th>
                <th>Concepto</th>
                <th>Emisión</th>
                <th>Vencimiento</th>
                <th>Monto</th>
                <th>Pagado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <td><strong>{f.propietario_nombre}</strong>{f.propiedad && <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{f.propiedad}</div>}</td>
                  <td>{f.concepto}</td>
                  <td>{fecha(f.fecha_emision)}</td>
                  <td>{fecha(f.fecha_vencimiento)}</td>
                  <td>{dinero(f.monto)}</td>
                  <td>{dinero(f.pagado)}</td>
                  <td><Badge estado={f.estado} /></td>
                  <td>
                    <div className="acciones">
                      {f.estado !== 'pagada' && f.estado !== 'anulada' && (
                        <button className="secundario" onClick={() => setModalPago(f)}>Registrar pago</button>
                      )}
                      <button className="peligro" onClick={() => eliminar(f)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalNueva && (
        <ModalNuevaFactura
          propietarios={propietarios}
          onCerrar={() => setModalNueva(false)}
          onGuardado={() => { setModalNueva(false); cargar(); }}
        />
      )}
      {modalPago && (
        <ModalPago
          factura={modalPago}
          onCerrar={() => setModalPago(null)}
          onGuardado={() => { setModalPago(null); cargar(); }}
        />
      )}
    </div>
  );
}

function ModalNuevaFactura({ propietarios, onCerrar, onGuardado }) {
  const [datos, setDatos] = useState({ propietario_id: '', concepto: 'Cuota de mantenimiento mensual', monto: '', fecha_vencimiento: '' });
  const [error, setError] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    try {
      await api.post('/facturas', datos);
      onGuardado();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>Nueva factura</h3>
        <div className="campo">
          <label>Propietario *</label>
          <select value={datos.propietario_id} required onChange={(e) => setDatos((d) => ({ ...d, propietario_id: e.target.value }))}>
            <option value="">Seleccionar...</option>
            {propietarios.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.propiedad ? `· ${p.propiedad}` : ''}</option>)}
          </select>
        </div>
        <div className="campo">
          <label>Concepto *</label>
          <input value={datos.concepto} required onChange={(e) => setDatos((d) => ({ ...d, concepto: e.target.value }))} />
        </div>
        <div className="fila">
          <div className="campo">
            <label>Monto *</label>
            <input type="number" step="any" value={datos.monto} required onChange={(e) => setDatos((d) => ({ ...d, monto: e.target.value }))} />
          </div>
          <div className="campo">
            <label>Fecha de vencimiento</label>
            <input type="date" value={datos.fecha_vencimiento} onChange={(e) => setDatos((d) => ({ ...d, fecha_vencimiento: e.target.value }))} />
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit">Guardar</button>
        </div>
      </form>
    </div>
  );
}

function ModalPago({ factura, onCerrar, onGuardado }) {
  const saldo = (factura.monto || 0) - (factura.pagado || 0);
  const [datos, setDatos] = useState({ monto: saldo > 0 ? saldo : '', metodo: 'efectivo', referencia: '' });
  const [error, setError] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    try {
      await api.post(`/facturas/${factura.id}/pagos`, datos);
      onGuardado();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h3>Registrar pago</h3>
        <p className="descripcion">
          {factura.concepto} · {factura.propietario_nombre}<br />
          Monto: {dinero(factura.monto)} · Pagado: {dinero(factura.pagado)} · Saldo: <strong>{dinero(saldo)}</strong>
        </p>
        <div className="fila">
          <div className="campo">
            <label>Monto *</label>
            <input type="number" step="any" value={datos.monto} required onChange={(e) => setDatos((d) => ({ ...d, monto: e.target.value }))} />
          </div>
          <div className="campo">
            <label>Método</label>
            <select value={datos.metodo} onChange={(e) => setDatos((d) => ({ ...d, metodo: e.target.value }))}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>
        <div className="campo">
          <label>Referencia</label>
          <input value={datos.referencia} onChange={(e) => setDatos((d) => ({ ...d, referencia: e.target.value }))} />
        </div>
        {error && <p className="error">{error}</p>}
        <div className="pie-modal">
          <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit">Registrar pago</button>
        </div>
      </form>
    </div>
  );
}
