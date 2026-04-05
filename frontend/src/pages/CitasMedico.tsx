import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  Filter, 
  Clock, 
  User, 
  Activity,
  AlertCircle,
  Menu,
  X,
  CalendarDays,
  History,
  Settings,
  LogOut
} from 'lucide-react';
import { apiClient } from '../api/client';
import { cn } from '../utils/tw';
import { useAuth } from '../context/AuthContext';

interface CitaCompleta {
  id: number;
  fecha_hora: string;
  especialidad: string;
  motivo: string;
  estado: string;
  paciente: string;
}

type FiltroTiempo = 'futuras' | 'pasadas' | 'todas';

export const CitasMedico = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [citas, setCitas] = useState<CitaCompleta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mockDateStr = import.meta.env.VITE_MOCK_CURRENT_DATE;

  const [filtroTiempo, setFiltroTiempo] = useState<FiltroTiempo>('futuras');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busquedaPaciente, setBusquedaPaciente] = useState('');

  useEffect(() => {
    const fetchAgenda = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get('/agenda-doctor');
        setCitas(response.data);
      } catch (err) {
        console.error("Error al cargar la agenda:", err);
        setError("No se pudo cargar la agenda. Por favor, inténtalo de nuevo más tarde.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgenda();
  }, []);

  const citasFiltradas = useMemo(() => {
    
    const ahora = mockDateStr ? new Date(mockDateStr) : new Date();

    return citas.filter(cita => {
      const fechaCita = new Date(cita.fecha_hora ? cita.fecha_hora.replace(' ', 'T') : '');
      const esFutura = fechaCita >= ahora;
      
      if (filtroTiempo === 'futuras' && !esFutura) return false;
      if (filtroTiempo === 'pasadas' && esFutura) return false;

      if (filtroEstado !== 'todos' && cita.estado !== filtroEstado) return false;

      if (busquedaPaciente.trim() !== '') {
        const busquedaNormalizada = busquedaPaciente.toLowerCase();
        const nombreNormalizado = (cita.paciente || '').toLowerCase();
        if (!nombreNormalizado.includes(busquedaNormalizada)) return false;
      }

      return true;
    });
  }, [citas, filtroTiempo, filtroEstado, busquedaPaciente]);

  const formatearFechaHora = (fechaHoraStr: string) => {
    if (!fechaHoraStr) return 'Fecha no disponible';
    const date = new Date(fechaHoraStr.replace(' ', 'T'));
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getEstilosEstado = (estado: string) => {
    switch (estado) {
      case 'confirmada':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'no_asistida':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatearEstado = (estado: string) => {
    return estado.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-accent/50 backdrop-blur-sm z-20 md:hidden"
          aria-hidden="true"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR (Columna Izquierda Fija) */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 w-64 bg-accent text-white flex flex-col flex-shrink-0 z-30 transition-transform duration-300 md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand */}
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 text-white">
            <Activity className="w-6 h-6" /> Kairós <span className="text-white font-light">MED</span>
          </h1>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label='Cerrar menú de navegación'
            className="md:hidden p-2 -mr-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button onClick={() => navigate('/medico/home')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors" onKeyDown={(e) => { if (e.key === 'Enter') navigate('/medico/home'); }}>
            <CalendarDays className="w-5 h-5" /> Resumen Diario
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-teal-500/10 text-teal-400 rounded-xl font-medium transition-colors" onClick={() => navigate('/medico/citas')} onKeyDown={(e) => { if (e.key === 'Enter') navigate('/medico/citas'); }}>
            <History className="w-5 h-5" /> Agenda Completa
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors" onClick={() => navigate('/medico/perfil')} onKeyDown={(e) => { if (e.key === 'Enter') navigate('/medico/perfil'); }}>
            <Settings className="w-5 h-5" /> Mi Perfil
          </button>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" /> Salir
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT (Columna Derecha) */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full pt-8 md:pt-8">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label='Abrir menú de navegación'
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Agenda Completa</h1>
              <p className="text-slate-500 mt-1">Revisa el historial y las próximas reservas</p>
            </div>
          </div>
        
        {/* Controles de Filtros */}
        <section 
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-end md:items-center"
          aria-label="Filtros de agenda"
        >
          {/* Búsqueda */}
          <div className="w-full md:w-1/3">
            <label htmlFor="buscarPaciente" className="block text-sm font-medium text-slate-700 mb-1">
              Buscar Paciente
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="buscarPaciente"
                value={busquedaPaciente}
                onChange={(e) => setBusquedaPaciente(e.target.value)}
                placeholder="Ej. Juan Pérez..."
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors"
              />
            </div>
          </div>

          {/* Filtro de Tiempo */}
          <div className="w-full sm:w-1/2 md:w-1/4">
            <label htmlFor="filtroTiempo" className="block text-sm font-medium text-slate-700 mb-1">
              Período
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </div>
              <select
                id="filtroTiempo"
                value={filtroTiempo}
                onChange={(e) => setFiltroTiempo(e.target.value as FiltroTiempo)}
                className="block w-full pl-9 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-lg border appearance-none bg-white"
              >
                <option value="futuras">Próximas Citas</option>
                <option value="pasadas">Citas Pasadas</option>
                <option value="todas">Toda la Historia</option>
              </select>
            </div>
          </div>

          {/* Filtro de Estado */}
          <div className="w-full sm:w-1/2 md:w-1/4">
            <label htmlFor="filtroEstado" className="block text-sm font-medium text-slate-700 mb-1">
              Estado de la Cita
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </div>
              <select
                id="filtroEstado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="block w-full pl-9 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-lg border appearance-none bg-white"
              >
                <option value="todos">Cualquier estado</option>
                <option value="confirmada">Confirmada</option>
                <option value="no_asistida">No Asistida</option>
              </select>
            </div>
          </div>
        </section>

        {/* Listado de Resultados */}
        <section aria-live="polite" className="mt-4">
          {/* Anuncio para Screen Readers sobre cantidad de resultados */}
          <div className="sr-only">
            {isLoading 
              ? "Cargando citas..." 
              : `Se han encontrado ${citasFiltradas.length} citas con los filtros actuales.`}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
              <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
              <p>Cargando información de la agenda...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center text-red-800 flex flex-col items-center">
              <AlertCircle className="w-10 h-10 mb-2 opacity-80" aria-hidden="true" />
              <p className="font-medium">{error}</p>
            </div>
          ) : citasFiltradas.length === 0 ? (
            <div className="bg-white border border-slate-200 p-12 rounded-xl text-center flex flex-col items-center">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Calendar className="w-12 h-12 text-slate-400" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No hay citas que mostrar</h3>
              <p className="text-slate-500 max-w-md">
                No se han encontrado citas que coincidan con los filtros seleccionados. Intenta ampliar tu búsqueda.
              </p>
            </div>
          ) : (
            <div className="flex justify-between items-center mb-4 px-1">
              <p className="text-sm font-medium text-slate-500">
                Mostrando <span className="text-slate-900">{citasFiltradas.length}</span> {citasFiltradas.length === 1 ? 'cita' : 'citas'}
              </p>
            </div>
          )}

          {/* Cuadrícula de Tarjetas */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {citasFiltradas.map((cita) => (
              <article 
                key={cita.id} 
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2 outline-none group" onClick={() => navigate(`/medico/citas/${cita.id}`)} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/medico/citas/${cita.id}`); }}
                tabIndex={0}
              >
                {/* Cabecera Tarjeta: Fecha y Estado */}
                <div className="flex justify-between items-start gap-2 mb-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 capitalize leading-tight">
                      {formatearFechaHora(cita.fecha_hora)}
                    </h2>
                  </div>
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap flex-shrink-0", getEstilosEstado(cita.estado))}>
                    {formatearEstado(cita.estado)}
                  </span>
                </div>

                {/* Cuerpo Tarjeta: Datos del Paciente */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-slate-400 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Paciente</p>
                      <p className="text-sm font-medium text-slate-900">{cita.paciente}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-slate-400 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Motivo / Especialidad</p>
                      <p className="text-sm text-slate-700 capitalize">{cita.motivo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{cita.especialidad}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        </div>
      </main>
    </div>
  );
};