import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { dinero } from '../lib/format.jsx';

export default function PanelFinanciero() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [cxc, dash, nom, act] = await Promise.all([
          api.get('/cuentas-por-cobrar').catch(() => null),
          api.get('/dashboard').catch(() => null),
          api.get('/nomina?periodicidad=mensual').catch(() => null),
          api.get('/activos/resumen').catch(() => null),
        ]);
        setD({
          porCobrar: cxc?.resumen?.total || 0,
          vencido: cxc?.resumen?.vencido || 0,
          propConSaldo: cxc?.resumen?.propietarios_con_saldo || 0,
          ingresosMes: dash?.finanzas?.ingresosMes || 0,
          gastosMes: dash?.finanzas?.gastosMes || 0,
          nominaMes: nom?.totales?.costo_total || nom?.totales?.bruto || 0,
          activos: act?.valor_libros || 0,
        });
      } catch (e) { setError(e.message); }
    })();
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!d) return <div className="cargando">Cargando...</div>;

  const egresosMes = d.gastosMes + d.nominaMes;
  const resultado = d.ingresosMes - egresosMes;
  const base = Math.max(d.ingresosMes, egresosMes) || 1;

  return (
    <div>
      <div className="barra">
        <div>
          <h2>Panel financiero</h2>
          <p className="descripcion">Resumen del mes: lo que se cobra, lo que entra y lo que se gasta en la asociación.</p>
        </div>
      </div>

      <h3>Cobranza</h3>
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <Stat etiqueta="Por cobrar (cuotas)" valor={dinero(d.porCobrar)} />
        <Stat etiqueta="Vencido" valor={dinero(d.vencido)} clase="rojo" />
        <Stat etiqueta="Propietarios con saldo" valor={d.propConSaldo} />
      </div>

      <h3>Resultado del mes</h3>
      <div className="grid grid-4" style={{ marginBottom: 14 }}>
        <Stat etiqueta="Ingresos (cuotas cobradas)" valor={dinero(d.ingresosMes)} clase="verde" />
        <Stat etiqueta="Gastos" valor={dinero(d.gastosMes)} />
        <Stat etiqueta="Nómina (costo total mensual)" valor={dinero(d.nominaMes)} />
        <Stat etiqueta="Resultado" valor={dinero(resultado)} clase={resultado >= 0 ? 'verde' : 'rojo'} />
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="pf-fila"><span>Ingresos</span><div className="pf-barra"><div style={{ width: `${(d.ingresosMes / base) * 100}%`, background: 'var(--verde)' }} /></div><strong>{dinero(d.ingresosMes)}</strong></div>
        <div className="pf-fila"><span>Egresos</span><div className="pf-barra"><div style={{ width: `${(egresosMes / base) * 100}%`, background: 'var(--rojo)' }} /></div><strong>{dinero(egresosMes)}</strong></div>
        <p className="descripcion" style={{ marginTop: 8 }}>Egresos = gastos del mes + nómina mensual. Valores indicativos para gestión.</p>
      </div>

      <h3>Patrimonio</h3>
      <div className="grid grid-3">
        <Stat etiqueta="Valor de activos (en libros)" valor={dinero(d.activos)} />
      </div>
    </div>
  );
}

function Stat({ etiqueta, valor, clase }) {
  return <div className="card stat"><div className="etiqueta">{etiqueta}</div><div className={`valor ${clase || ''}`}>{valor}</div></div>;
}
