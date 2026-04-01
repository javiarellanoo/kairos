// src/pages/Landing.tsx
import { Activity, Bell, CalendarDays, Cog, User, LogOut, ChevronDown, LucideBellDot, Plus } from 'lucide-react';
import React from 'react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

export const PacienteHome = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [upcomingAppointments, setUpcomingAppointments] = React.useState([]);

    React.useEffect(() => {
        const fetchAppointments = async () => {
            const appointments = await getUpcomingAppointments();
            setUpcomingAppointments(appointments);
        };

        fetchAppointments();
    }, []);

    const handleOpenMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const getUpcomingAppointments = async () => {
        try {
            const response = await apiClient.get('/citas/proximas', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            console.log("Citas próximas:", response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching upcoming appointments:', error);
            return [];
        }

    };


  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-50 font-sans selection:bg-blue-200">
      
      <header className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center gap-2 cursor-pointer shrink-0">
            <div className="rounded-lg bg-primary p-1 sm:p-1.5">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Kairós
            </span>
          </div>

          <div className="relative flex items-center gap-2 sm:gap-3 shrink-0">
            <LucideBellDot className="h-5 w-5 text-slate-600" />
            <Button 
              variant="options"
              onClick={() => handleOpenMenu()}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              <span> {user?.nombre}</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg shadow-black/5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/perfil');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
                >
                  <User className="h-4 w-4" />
                  Mi Perfil
                </button>
                <div className="h-px w-full bg-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
          
        </div>
      </header>

      <main className="relative mt-30 overflow-hidden bg-transparent px-4 pb-16 pt-12 text-white sm:mt-35 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-32 lg:pt-24">

        <div className="mx-auto max-w-7xl relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
            
            <div className="lg:col-span-6 text-center lg:text-left">
              <h1 className="text-4xl font-extrabold tracking-tight text-black sm:text-5xl lg:text-6xl text-balance leading-tight">
                Tu salud no entiende de esperas. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-cyan-300">Nosotros tampoco.</span>
              </h1>
              
              <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed text-balance">
                Olvídate de refrescar la pantalla. Mientras tú descansas, nosotros adelantamos tu cita.
              </p>
              
            </div>

            <div className="lg:col-span-6 mt-16 lg:mt-0">
              <div className="flex flex-col gap-4 sm:gap-6 max-w-md mx-auto lg:max-w-none relative">
                
                <article className="group flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-5 sm:p-6 shadow-2xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-950 text-primary group-hover:bg-primary/80 group-hover:text-white transition-colors duration-300">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">Citas a tu medida</h3>
                    <p className="mt-1 text-sm sm:text-base text-slate-400 leading-relaxed">Las citas se adaptan a tu disponibilidad horaria preferida.</p>
                  </div>
                </article>

                <article className="group flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-5 sm:p-6 shadow-2xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900 lg:ml-8">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-950 text-primary group-hover:bg-primary/80 group-hover:text-white transition-colors duration-300">
                    <Cog className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">Gestión inteligente</h3>
                    <p className="mt-1 text-sm sm:text-base text-slate-400 leading-relaxed">El sistema reacciona en milisegundos ante cualquier cancelación en el hospital.</p>
                  </div>
                </article>

                <article className="group flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-5 sm:p-6 shadow-2xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-950 text-primary group-hover:bg-primary/80 group-hover:text-white transition-colors duration-300">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">Alertas en tiempo real</h3>
                    <p className="mt-1 text-sm sm:text-base text-slate-400 leading-relaxed">Recibe notificaciones inmediatas con recordatorios y actualizaciones sobre tu cita.</p>
                  </div>
                </article>

              </div>
            </div>

          </div>
        </div>
        <Button
          variant="options_dark"
          className="absolute bottom-4 right-4 sm:bottom-6 sm:right-8 z-50"
          onClick={() => navigate('/nueva-cita')}
        >
          <Plus className="h-4 w-4" />
          Nueva cita
        </Button>
      </main>

      <footer className="w-full border-t border-slate-200 bg-white py-3">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="h-5 w-5" />
            <span className="font-semibold text-slate-500">Javier Arellano López</span>
          </div>
          <p className="text-sm text-slate-400">
            Trabajo de Fin de Grado - Universidad de Sevilla - 2026
          </p>
        </div>
      </footer>

    </div>
  );
};