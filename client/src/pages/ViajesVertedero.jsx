import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import CrudModule from '../components/CrudModule.jsx';
import { fecha } from '../lib/format.jsx';

const hoy = new Date().toISOString().slice(0, 10);

export default function ViajesVertedero() {
  const [resumen, setResumen] = useState(null);

  const cargarResumen = useCallback(async () => {
    setResumen(await api.get('/viajes-vertedero/resumen').catch(() => null));
  }, []);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  return (
    <div>
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <Stat etiqueta="Viajes de hoy" valor={resumen?.hoy} />
        <Stat etiqueta="Viajes este mes" valor={resumen?.mes} />
        <Stat etiqueta="Total registrados" valor={resumen?.total} />
      </div>

      <CrudModule
        titulo="Viajes al vertedero"
        descripcion="Registro de las salidas del camión de basura al vertedero, para contarlas por día, mes y total."
        endpoint="/viajes-vertedero"
        onCambio={cargarResumen}
        columnas={[
          { key: 'fecha', label: 'Fecha', render: (f) => fecha(f.fecha) },
          { key: 'hora_salida', label: 'Salida' },
          { key: 'hora_regreso', label: 'Regreso' },
          { key: 'vehiculo', label: 'Vehículo' },
          { key: 'responsable_nombre', label: 'Responsable' },
          { key: 'notas', label: 'Notas' },
        ]}
        campos={[
          { name: 'fecha', label: 'Fecha', type: 'date', defecto: hoy },
          { name: 'hora_salida', label: 'Hora de salida', type: 'time' },
          { name: 'hora_regreso', label: 'Hora de regreso', type: 'time' },
          { name: 'vehiculo', label: 'Vehículo (placa o nombre)' },
          { name: 'responsable_id', label: 'Responsable / conductor', type: 'select', fuente: '/empleados', labelKey: 'nombre' },
          { name: 'notas', label: 'Notas', type: 'textarea' },
        ]}
      />
    </div>
  );
}

function Stat({ etiqueta, valor }) {
  return (
    <div className="card stat">
      <div className="etiqueta">{etiqueta}</div>
      <div className="valor verde">{valor ?? '…'}</div>
    </div>
  );
}
