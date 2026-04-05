import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Bell, 
  Send,
  AlertCircle,
  FilePlus2,
  X
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/tw';

interface CitaDetalle {
  id: number;
  fecha_hora: string;
  especialidad: string;
  motivo: string;
  estado: string;
  medico: string;
  consulta: string;
  paciente: string; 
  observaciones_volante?: string | null;
}

interface Especialidad {
  nombre: string;
}

export const DetallesCitaMedico = () => {
  const { id_cita } = useParams<{ id_cita: string }>();
  const navigate = useNavigate();
  
  const [cita, setCita] = useState<CitaDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionLoading, setAccionLoading] = useState<string | null>(null);

  const [isVolanteModalOpen, setIsVolanteModalOpen] = useState(false);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [volanteForm, setVolanteForm] = useState({
    especialidad_destino: '',
    motivo: 'Volante - Derivación Media',
    observaciones: ''
  });

  useEffect(() => {
    const fetchDetalles = async () => {
      try {
        setIsLoading(true);
        const { data } = await apiClient.get(`/citas/${id_cita}`);
        setCita({ ...data, paciente: data.paciente || "Paciente Desconocido" });
      } catch (err) {
        setError("No se pudieron cargar los detalles de la cita.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetalles();
  }, [id_cita]);

  useEffect(() => {
    if (isVolanteModalOpen && especialidades.length === 0) {
      apiClient.get('/doctors/especialidades').then(res => setEspecialidades(res.data.map((esp: any) => ({ nombre: esp.nombre })))).catch(console.error);
    }
  }, [isVolanteModalOpen, especialidades.length]);

  const cambiarEstado = async (nuevoEstado: 'confirmada' | 'no_asistida') => {
    try {
      setAccionLoading(nuevoEstado);
      await apiClient.patch(`/doctors/citas/${id_cita}`, { estado: nuevoEstado });
      setCita(prev => prev ? { ...prev, estado: nuevoEstado } : null);
    } catch (err) {
      alert("Hubo un error al actualizar la asistencia.");
    } finally {
      setAccionLoading(null);
    }
  };

  const enviarRecordatorio = () => {
    setAccionLoading('recordatorio');
    setTimeout(() => {
      alert("Recordatorio enviado con éxito al agente del paciente.");
      setAccionLoading(null);
    }, 1000);
  };

  const generarVolante = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAccionLoading('volante');
      console.log("Generando volante con datos:", volanteForm);
      await apiClient.post(`/volantes/${id_cita}`, volanteForm);
      setIsVolanteModalOpen(false);
      alert("Volante generado y asignado al paciente correctamente.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al generar el volante.");
    } finally {
      setAccionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Cargando expediente...</p>
      </div>
    );
  }

  if (error || !cita) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Error de acceso</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Volver a la agenda</Button>
      </div>
    );
  }

  const fechaObj = new Date(cita.fecha_hora.replace(' ', 'T'));
  const fechaFormateada = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const horaFormateada = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* Cabecera */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              aria-label="Volver a la agenda"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">Detalles de la Cita</h1>
          </div>
          <div className="text-sm font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
            ID: #{cita.id.toString().padStart(4, '0')}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: Información */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tarjeta de Paciente */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" aria-labelledby="titulo-paciente">
            <h2 id="titulo-paciente" className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">
              <User className="w-5 h-5 text-teal-600" aria-hidden="true" /> Datos del Paciente
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-2xl" aria-hidden="true">
                {cita.paciente?.charAt(0) || 'P'}
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{cita.paciente}</p>
                <p className="text-sm text-slate-500">Expediente disponible en sistema central</p>
              </div>
            </div>
          </section>

          {/* Tarjeta de Detalles de Cita */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" aria-labelledby="titulo-detalles">
            <h2 id="titulo-detalles" className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">
              <FileText className="w-5 h-5 text-teal-600" aria-hidden="true" /> Información de la Consulta
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Fecha
                </p>
                <p className="text-slate-900 font-medium capitalize">{fechaFormateada}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Hora Programada
                </p>
                <p className="text-slate-900 font-medium text-lg">{horaFormateada} hrs</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Motivo reportado por el paciente:</p>
              <div className="bg-amber-50 border border-amber-100 text-amber-900 p-4 rounded-xl text-sm leading-relaxed">
                "{cita.motivo}"
              </div>
            </div>
            {cita.observaciones_volante && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Observaciones:</p>
                <div className="bg-blue-50 border border-blue-100 text-blue-900 p-4 rounded-xl text-sm leading-relaxed">
                  "{cita.observaciones_volante}"
                </div>
              </div>
            )}
          </section>
        </div>

        {/* COLUMNA DERECHA: Acciones */}
        <aside className="space-y-6">
          
          {/* Panel de Asistencia */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" aria-labelledby="titulo-acciones">
            <h2 id="titulo-acciones" className="text-base font-bold text-slate-900 mb-4 uppercase tracking-wider text-center">
              Gestión de Asistencia
            </h2>
            
            <div className="space-y-3">

              <Button 
                variant="outline" 
                onClick={() => {
                  if(window.confirm('¿Seguro que deseas marcar al paciente como no presentado?')) cambiarEstado('no_asistida');
                }}
                isLoading={accionLoading === 'no_asistida'}
                disabled={cita.estado === 'no_asistida'}
                className={cn(
                  "w-full justify-start py-3", 
                  cita.estado === 'no_asistida' ? "bg-red-50 text-red-700 border-red-200 opacity-100" : "hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                )}
              >
                <XCircle className="w-5 h-5 mr-3" /> 
                {cita.estado === 'no_asistida' ? 'Marcado como Ausente' : 'Marcar No Presentado'}
              </Button>
            </div>
          </section>

          {/* Panel de Herramientas Adicionales */}
          <section className="bg-slate-800 text-white p-6 rounded-2xl shadow-sm" aria-label="Herramientas adicionales">
            <p className="text-sm text-slate-300 mb-4 font-medium uppercase tracking-wider">Acciones Clínicas</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => setIsVolanteModalOpen(true)}
                disabled={cita.estado === 'no_asistida'}
                className="w-full flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <span className="flex items-center gap-3 font-medium">
                  <FilePlus2 className="w-5 h-5 text-teal-400" /> Crear Volante
                </span>
                <ArrowLeft className="w-4 h-4 rotate-180 text-slate-400" />
              </button>

              <button 
                onClick={enviarRecordatorio}
                disabled={accionLoading === 'recordatorio' || cita.estado === 'no_asistida'}
                className="w-full flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <span className="flex items-center gap-3 font-medium">
                  <Bell className="w-5 h-5 text-amber-400" /> Enviar Notas / Avisos
                </span>
                <Send className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </section>

        </aside>
      </main>

      {/* MODAL ACCESIBLE: CREAR VOLANTE */}
      {isVolanteModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-volante-titulo"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 id="modal-volante-titulo" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FilePlus2 className="w-5 h-5 text-teal-600" aria-hidden="true"/> Derivar a Especialista
              </h3>
              <button 
                onClick={() => setIsVolanteModalOpen(false)}
                aria-label="Cerrar ventana"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={generarVolante} className="p-5 space-y-4">
              <div>
                <label htmlFor="especialidad" className="block text-sm font-medium text-slate-700 mb-1">
                  Especialidad de Destino *
                </label>
                <select 
                  id="especialidad"
                  required
                  value={volanteForm.especialidad_destino}
                  onChange={(e) => setVolanteForm({...volanteForm, especialidad_destino: e.target.value})}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
                >
                  <option value="" disabled>Seleccione una especialidad...</option>
                  {especialidades.map((esp, i) => (
                    <option key={i} value={esp.nombre}>{esp.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="prioridad" className="block text-sm font-medium text-slate-700 mb-1">
                  Prioridad Clínica *
                </label>
                <select 
                  id="prioridad"
                  required
                  value={volanteForm.motivo}
                  onChange={(e) => setVolanteForm({...volanteForm, motivo: e.target.value})}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
                >
                  <option value="Volante - Derivación Baja">Baja (Rutinaria)</option>
                  <option value="Volante - Derivación Media">Media (Preferente)</option>
                  <option value="Volante - Derivación Alta">Alta (Urgente)</option>
                </select>
              </div>

              <div>
                <label htmlFor="observaciones" className="block text-sm font-medium text-slate-700 mb-1">
                  Motivo y Observaciones
                </label>
                <textarea 
                  id="observaciones"
                  rows={4}
                  placeholder="Detalle el motivo de la derivación..."
                  value={volanteForm.observaciones}
                  onChange={(e) => setVolanteForm({...volanteForm, observaciones: e.target.value})}
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow resize-none"
                ></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsVolanteModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  isLoading={accionLoading === 'volante'}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  Crear Volante
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};