// src/pages/Landing.tsx
import { Activity, Bell, CalendarDays, Cog, User, LogOut, ChevronDown, LucideBellDot, Plus, Bot, ArrowRight, Check } from 'lucide-react';
import React from 'react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { AppointmentCard, CitaType } from '../components/citas/AppointmentCard';
import { ProposalCard } from '../components/citas/ProposalCard';

export const PacienteHome = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [upcomingAppointments, setUpcomingAppointments] = React.useState<CitaType[]>([]);
    const [possibleAppointments, setPossibleAppointments] = React.useState<CitaType[]>([]);

    const fetchAppointments = async () => {
        const possible = await getPossibleAppointments();
        setPossibleAppointments(possible);
        const appointments = await getUpcomingAppointments();
        setUpcomingAppointments(appointments);
    };

    React.useEffect(() => {
        fetchAppointments();
    }, []);

    const handleOpenMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const getPossibleAppointments = async () => {
        try {
            const response = await apiClient.get('/citas/adelantos');
            console.log("Citas posibles:", response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching possible appointments:', error);
            return [];
        }
    };

    const getUpcomingAppointments = async () => {
        try {
            const response = await apiClient.get('/citas/proximas');
            console.log("Citas próximas:", response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching upcoming appointments:', error);
            return [];
        }

    };


  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-50 font-sans selection:bg-blue-200 flex flex-col">
      
      <header className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md shrink-0">
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

      <main className="relative flex-1 overflow-y-auto bg-transparent px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl relative z-10 w-full flex flex-col gap-6 sm:gap-8">
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Tus Próximas Citas
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-500">
              Gestiona tus consultas y revisa las propuestas para adelantar tus citas.
            </p>
          </div>

          {/* Proposals List */}
          {possibleAppointments.length > 0 && (
            <div className="flex flex-col gap-4">
              {possibleAppointments.map((cita) => (
                <ProposalCard 
                  key={`prop_${cita.id}`} 
                  appointment={cita} 
                  onResolve={fetchAppointments} 
                />
              ))}
            </div>
          )}

          {/* Appointments List */}
          <div className="flex flex-col gap-3 sm:gap-4 mt-2">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((cita) => (
                <AppointmentCard key={`cita_${cita.id}`} appointment={cita} />
              ))
            ) : (
              <p className="text-slate-500 text-center py-10 bg-slate-100/50 rounded-3xl border border-dashed border-slate-300">
                No tienes citas próximas.
              </p>
            )}
          </div>
        </div>

        <Button
          variant="options_dark"
          className="fixed bottom-20 right-4 sm:bottom-20 sm:right-8 z-50 shadow-lg shadow-black/20 hover:-translate-y-1 transition-transform"
          onClick={() => navigate('/nueva-cita')}
        >
          <Plus className="h-4 w-4" />
          Nueva cita
        </Button>
      </main>

      <footer className="w-full border-t border-slate-200 bg-white py-3 shrink-0">
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