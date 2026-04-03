
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDays, 
  History, 
  Settings, 
  LogOut, 
  Users, 
  AlertCircle, 
  Activity, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  Clock,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { cn } from '../utils/tw';

// Tipos para el estado de la UI
interface CitaMedico {
  id: number;
  paciente: string;
  hora: string;
  especialidad: string;
  motivo: string;
  estado: 'confirmada' | 'buscando' | 'no_asistida';
  total_citas_dia: number;
}

export const MedicoHome = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [citas, setCitas] = useState<CitaMedico[]>([]);
  const mockDateStr = import.meta.env.VITE_MOCK_CURRENT_DATE;
  const today = mockDateStr ? new Date(mockDateStr) : new Date();
  const citas_canceladas = citas.filter(cita => cita.estado === 'no_asistida').length;
  const tasa_ocupacion = citas.length > 0 ? Math.round((citas.filter(cita => cita.estado === 'confirmada').length / citas[0].total_citas_dia) * 100) : 0;
  const pacientes_hoy = citas.filter(cita => cita.estado === 'confirmada').length;

  const getCitas = async () => {
    try {
      const response = await apiClient.get('/agenda-hoy');
      setCitas(response.data);
    } catch (error) {
      console.error('Error fetching citas:', error);
    }
  };

  useEffect(() => {
    getCitas();
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  const fechaHoy = new Intl.DateTimeFormat('es-ES', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  }).format(today);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Cargando panel médico...</div>;
  }

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
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-teal-500/10 text-teal-400 rounded-xl font-medium transition-colors">
            <CalendarDays className="w-5 h-5" /> Mi Agenda
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors">
            <History className="w-5 h-5" /> Historial
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors" onClick={() => navigate('/medico/perfil')} onKeyDown={(e) => { if (e.key === 'Enter') navigate('/medico/perfil'); }}>
            <Settings className="w-5 h-5" /> Ajustes

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
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* Top Header */}
        <header className="px-4 md:px-8 py-4 md:py-6 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label='Abrir menú de navegación'
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-accent capitalize leading-tight">Dr/Dra. {user?.nombre}</h2>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5 md:mt-1 capitalize">{fechaHoy}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs md:text-sm font-bold shadow-sm whitespace-nowrap">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></div>
              <span className="hidden sm:inline">Agente Kairós Activo</span>
              <span className="sm:hidden">Kairós Activo</span>
            </div>

            <button 
              onClick={() => navigate('/medico/abrir-agenda')}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-accent hover:bg-accent/90 text-white rounded-full text-xs md:text-sm font-bold shadow-sm whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              aria-label="Abrir Agenda"
            >
              <CalendarDays className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Abrir Agenda</span>
              <span className="sm:hidden">Agenda</span>
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
          
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-blue-50 text-primary rounded-xl"><Users className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Pacientes Hoy</p>
                <p className="text-2xl font-bold text-accent">{pacientes_hoy}</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-red-50 text-red-600 rounded-xl"><AlertCircle className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-500 text-sm font-medium">No Asistencias</p>
                <p className="text-2xl font-bold text-accent">{citas_canceladas}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-teal-50 text-teal-600 rounded-xl"><Activity className="w-6 h-6" /></div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Tasa de Ocupación</p>
                <p className="text-2xl font-bold text-accent">{tasa_ocupacion}%</p>
              </div>
            </div>
          </div>

          {/* Agenda Timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" /> Próximas Consultas
              </h3>
            </div>
            
            <div className="p-4 sm:p-6 space-y-0 relative">
              {/* Línea vertical decorativa de la timeline (Oculta en móvil) */}
              <div className="hidden sm:block absolute left-[88px] top-6 bottom-6 w-0.5 bg-slate-100"></div>

              {citas.map((cita) => {
                const isBuscando = cita.estado === 'buscando';
                
                return (
                  <div key={cita.id} className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 py-4 group">
                    <div className="flex items-center gap-4 sm:contents">
                      {/* Hora */}
                      <div className={cn(
                        "sm:w-16 text-left sm:text-right font-bold text-base sm:text-lg flex-shrink-0",
                        isBuscando ? "text-amber-600" : "text-slate-700"
                      )}>
                        {cita.hora}
                      </div>

                      {/* Nodo de la Timeline */}
                      <div className="relative z-10 w-4 h-4 rounded-full border-4 border-white bg-slate-300 shadow-sm group-hover:bg-slate-400 transition-colors flex-shrink-0 hidden sm:block"></div>
                    </div>

                    {/* Tarjeta de la Cita */}
                    <div className={cn(
                      "w-full sm:flex-1 p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all",
                      isBuscando 
                        ? "bg-amber-50 border-amber-200 shadow-sm shadow-amber-900/5" 
                        : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-md"
                    )}>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={cn(
                            "font-bold text-lg",
                            isBuscando ? "text-amber-900" : "text-accent"
                          )}>
                            {isBuscando ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                                Buscando paciente...
                              </span>
                            ) : (
                              cita.paciente
                            )}
                          </span>
                          
                          {!isBuscando && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Confirmada
                            </span>
                          )}
                        </div>
                        {cita.estado === 'confirmada' && (
                          <p className={cn(
                            "text-sm font-medium",
                            isBuscando ? "text-amber-700" : "text-slate-500"
                          )}>
                            {cita.motivo}
                          </p>
                        )}
                      </div>
                      
                      {/* Botón de acción */}
                      <button className={cn(
                        "p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 sm:self-center self-end -mt-10 sm:mt-0",
                        isBuscando 
                          ? "text-amber-600 hover:bg-amber-100 focus:ring-amber-500" 
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:ring-slate-500"
                      )}
                      aria-label="Ver detalles"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};