import { useState } from 'react';
import CrudModule from '../components/CrudModule.jsx';
import Credencial from '../components/Credencial.jsx';

export default function Visitantes() {
  const [credencial, setCredencial] = useState(null);

  return (
    <>
      <CrudModule
        titulo="Visitantes"
        descripcion="Familiares, invitados y proveedores asociados a cada propietario. Cada uno tiene una credencial con código QR."
        endpoint="/visitantes"
        accionesExtra={[{ texto: 'Credencial', onClick: (f) => setCredencial(f) }]}
        columnas={[
          { key: 'nombre', label: 'Nombre' },
          { key: 'documento', label: 'Documento' },
          { key: 'tipo', label: 'Tipo', render: (f) => <span style={{ textTransform: 'capitalize' }}>{f.tipo}</span> },
          { key: 'propietario_nombre', label: 'Propietario' },
          { key: 'placa_vehiculo', label: 'Placa' },
          { key: 'codigo', label: 'Código', render: (f) => <code style={{ fontSize: 12 }}>{f.codigo}</code> },
        ]}
        campos={[
          { name: 'nombre', label: 'Nombre completo', requerido: true },
          { name: 'documento', label: 'Documento de identidad' },
          { name: 'telefono', label: 'Teléfono' },
          {
            name: 'tipo', label: 'Tipo de visitante', type: 'select', defecto: 'invitado',
            opciones: [
              { valor: 'familiar', label: 'Familiar' },
              { valor: 'invitado', label: 'Invitado' },
              { valor: 'proveedor', label: 'Proveedor' },
            ],
          },
          { name: 'propietario_id', label: 'Propietario asociado', type: 'select', fuente: '/propietarios', labelKey: 'nombre' },
          { name: 'placa_vehiculo', label: 'Placa del vehículo' },
          { name: 'notas', label: 'Notas', type: 'textarea' },
        ]}
      />
      {credencial && <Credencial visitante={credencial} onCerrar={() => setCredencial(null)} />}
    </>
  );
}
