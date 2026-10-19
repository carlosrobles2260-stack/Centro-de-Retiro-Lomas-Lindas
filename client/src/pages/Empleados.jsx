import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { dinero, fecha, Badge } from '../lib/format.jsx';
import CrudModule from '../components/CrudModule.jsx';

const DEPARTAMENTOS = [
  { valor: 'seguridad', label: 'Seguridad' },
  { valor: 'ornato', label: 'Ornato / recolección' },
  { valor: 'administracion', label: 'Administración' },
  { valor: 'mantenimiento', label: 'Mantenimiento' },
  { valor: 'cocina', label: 'Cocina' },
  { valor: 'otro', label: 'Otro' },
];
const CONTRATOS = [
  { valor: 'indefinido', label: 'Indefinido' },
  { valor: 'temporal', label: 'Temporal' },
  { valor: 'ocasional', label: 'Ocasional' },
];
const ESTADO_CIVIL = [
  { valor: 'soltero', label: 'Soltero/a' },
  { valor: 'casado', label: 'Casado/a' },
  { valor: 'union_libre', label: 'Unión libre' },
  { valor: 'divorciado', label: 'Divorciado/a' },
  { valor: 'viudo', label: 'Viudo/a' },
];

export default function Empleados() {
  const [ficha, setFicha] = useState(null);
  return (
    <div>
      <CrudModule
        titulo="Empleados"
        descripcion="Personal de la asociación: seguridad, ornato (recolección), mantenimiento y administración. Abre la ficha para ver todos los datos y calcular prestaciones."
        endpoint="/empleados"
        accionesExtra={[{ texto: 'Ficha', onClick: (f) => setFicha(f) }]}
        columnas={[
          { key: 'nombre', label: 'Nombre' },
          { key: 'puesto', label: 'Puesto' },
          { key: 'departamento', label: 'Departamento', render: (f) => DEPARTAMENTOS.find((d) => d.valor === f.departamento)?.label || f.departamento },
          { key: 'telefono', label: 'Teléfono' },
          { key: 'salario', label: 'Salario', render: (f) => dinero(f.salario) },
          { key: 'activo', label: 'Estado', render: (f) => <Badge estado={f.activo ? 'normal' : 'gris'} /> },
        ]}
        campos={[
          { name: 'nombre', label: 'Nombre completo', requerido: true },
          { name: 'documento', label: 'Cédula / documento' },
          { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
          { name: 'nacionalidad', label: 'Nacionalidad', defecto: 'Dominicana' },
          { name: 'genero', label: 'Género', type: 'select', opciones: [{ valor: 'M', label: 'Masculino' }, { valor: 'F', label: 'Femenino' }] },
          { name: 'estado_civil', label: 'Estado civil', type: 'select', opciones: ESTADO_CIVIL },
          { name: 'direccion', label: 'Dirección' },
          { name: 'telefono', label: 'Teléfono' },
          { name: 'email', label: 'Correo electrónico', type: 'email' },
          { name: 'puesto', label: 'Puesto / cargo' },
          { name: 'departamento', label: 'Departamento', type: 'select', defecto: 'seguridad', opciones: DEPARTAMENTOS },
          { name: 'tipo_contrato', label: 'Tipo de contrato', type: 'select', defecto: 'indefinido', opciones: CONTRATOS },
          { name: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date' },
          { name: 'salario', label: 'Salario mensual', type: 'number' },
          { name: 'nss', label: 'Seguridad social (NSS/TSS)' },
          { name: 'banco', label: 'Banco' },
          { name: 'cuenta_banco', label: 'Cuenta bancaria' },
          { name: 'contacto_emergencia', label: 'Contacto de emergencia' },
          { name: 'telefono_emergencia', label: 'Teléfono de emergencia' },
          { name: 'notas', label: 'Notas', type: 'textarea' },
          { name: 'activo', label: 'Activo (1 = sí, 0 = no)', type: 'number', defecto: 1 },
        ]}
      />
      {ficha && <FichaEmpleado empleado={ficha} onCerrar={() => setFicha(null)} />}
    </div>
  );
}

const TIPOS_SALIDA = [
  { valor: 'desahucio', label: 'Desahucio (lo ejerce el empleador)' },
  { valor: 'despido', label: 'Despido justificado' },
  { valor: 'renuncia', label: 'Renuncia / dimisión' },
];

function FichaEmpleado({ empleado: e, onCerrar }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [tipo, setTipo] = useState('desahucio');
  const [hasta, setHasta] = useState(hoy);
  const [calc, setCalc] = useState(null);
  const [error, setError] = useState(null);
  const [calculando, setCalculando] = useState(false);

  async function calcular() {
    setCalculando(true); setError(null);
    try {
      setCalc(await api.get(`/empleados/${e.id}/prestaciones?tipo=${tipo}&hasta=${hasta}`));
    } catch (err) { setError(err.message); setCalc(null); }
    finally { setCalculando(false); }
  }

  const dep = DEPARTAMENTOS.find((d) => d.valor === e.departamento)?.label || e.departamento;

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal modal-ancho" onClick={(ev) => ev.stopPropagation()}>
        <h3>Ficha del empleado</h3>
        <div className="ficha-cab">
          <div>
            <div className="ficha-nombre">{e.nombre}</div>
            <div className="descripcion">{e.puesto || '—'}{dep ? ` · ${dep}` : ''}</div>
          </div>
          <Badge estado={e.activo ? 'normal' : 'gris'} />
        </div>

        <div className="ficha-grid">
          <Dato k="Cédula / documento" v={e.documento} />
          <Dato k="Fecha de nacimiento" v={e.fecha_nacimiento && fecha(e.fecha_nacimiento)} />
          <Dato k="Nacionalidad" v={e.nacionalidad} />
          <Dato k="Estado civil" v={ESTADO_CIVIL.find((x) => x.valor === e.estado_civil)?.label} />
          <Dato k="Teléfono" v={e.telefono} />
          <Dato k="Correo" v={e.email} />
          <Dato k="Dirección" v={e.direccion} ancho />
          <Dato k="Tipo de contrato" v={CONTRATOS.find((x) => x.valor === e.tipo_contrato)?.label} />
          <Dato k="Fecha de ingreso" v={e.fecha_ingreso && fecha(e.fecha_ingreso)} />
          <Dato k="Salario mensual" v={dinero(e.salario)} />
          <Dato k="Seguridad social" v={e.nss} />
          <Dato k="Banco" v={e.banco} />
          <Dato k="Cuenta bancaria" v={e.cuenta_banco} />
          <Dato k="Contacto de emergencia" v={e.contacto_emergencia} />
          <Dato k="Tel. de emergencia" v={e.telefono_emergencia} />
          {e.notas && <Dato k="Notas" v={e.notas} ancho />}
        </div>

        <h4 style={{ margin: '18px 0 6px' }}>Prestaciones laborales</h4>
        <p className="descripcion">Cálculo estimado según el Código de Trabajo de la República Dominicana. Verifique el cálculo oficial con el Ministerio de Trabajo.</p>
        {!e.fecha_ingreso && <p className="error">Registra la fecha de ingreso del empleado para calcular las prestaciones.</p>}
        <div className="fila" style={{ alignItems: 'flex-end' }}>
          <div className="campo" style={{ margin: 0 }}><label>Tipo de terminación</label>
            <select value={tipo} onChange={(ev) => setTipo(ev.target.value)}>
              {TIPOS_SALIDA.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
            </select>
          </div>
          <div className="campo" style={{ margin: 0 }}><label>Hasta la fecha</label>
            <input type="date" value={hasta} onChange={(ev) => setHasta(ev.target.value)} />
          </div>
          <button onClick={calcular} disabled={calculando || !e.fecha_ingreso}>{calculando ? 'Calculando...' : 'Calcular'}</button>
        </div>
        {error && <p className="error">{error}</p>}

        {calc && (
          <div style={{ marginTop: 14 }}>
            <p className="descripcion">
              Antigüedad: <strong>{calc.antiguedad.anios} año(s) y {calc.antiguedad.meses} mes(es)</strong> · Salario diario: {dinero(calc.salarioDiario)}
            </p>
            <table>
              <thead><tr><th>Concepto</th><th>Días</th><th>Monto</th></tr></thead>
              <tbody>
                {calc.componentes.map((c) => (
                  <tr key={c.clave} style={{ opacity: c.aplica ? 1 : 0.45 }}>
                    <td>{c.etiqueta}{!c.aplica && ' (no aplica)'}</td>
                    <td>{c.dias != null ? c.dias : '—'}</td>
                    <td>{c.aplica ? dinero(c.monto) : '—'}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} style={{ fontWeight: 700, textAlign: 'right' }}>Total a pagar</td>
                  <td style={{ fontWeight: 700 }}>{dinero(calc.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="pie-modal"><button className="secundario" onClick={onCerrar}>Cerrar</button></div>
      </div>
    </div>
  );
}

function Dato({ k, v, ancho }) {
  return (
    <div className="ficha-dato" style={ancho ? { gridColumn: '1 / -1' } : undefined}>
      <div className="ficha-k">{k}</div>
      <div className="ficha-v">{v || '—'}</div>
    </div>
  );
}
