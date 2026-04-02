// src/pages/CitaDetalle.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, Stethoscope, UserCircle, MapPin, XCircle, Activity, LucideBellDot, User, ChevronDown, LogOut, NotebookTabs } from 'lucide-react';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export const CitaDetalle = () => {
  const { id_cita } = useParams<{ id_cita: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [cita, setCita] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  const mockDateStr = import.meta.env.VITE_MOCK_CURRENT_DATE;
  const today = mockDateStr ? new Date(mockDateStr) : new Date();

  useEffect(() => {
    if (!id_cita) {
      navigate('/home');
      return;
    }

    const fetchDetalleCita = async () => {
      try {
        const response = await apiClient.get(`/citas/${id_cita}`);
        setCita(response.data);
      } catch (error) {
        console.error("Error al cargar la cita:", error);
        alert("No se pudo cargar la información de la cita.");
        navigate('/mis-citas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetalleCita();
  }, [id_cita, navigate]);

      const handleCancelarCita = async () => {
      setIsCancelling(true);
      try {
        await apiClient.patch(`/cancelar-cita/${id_cita}`);
        navigate('/home');
      } catch (error) {
        console.error("Error al cancelar la cita:", error);
        alert("No se pudo cancelar la cita.");
      } finally {
        setIsCancelling(false);
        setIsCancelModalOpen(false);
      }
    };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Cargando detalles...</div>;
  }


  if (!cita) return null;

  const esCancelable = cita.fecha_hora && new Date(cita.fecha_hora) > today 
  const texto_estado = cita.estado === 'confirmada' ? 'Confirmada' : (cita.estado === 'lista_espera' ? 'En lista de espera' : 'Cancelada');
  const color_estado = cita.estado === 'confirmada' ? 'bg-green-600 text-white' : (cita.estado === 'lista_espera' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white');

  const handleOpenMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-50 font-sans selection:bg-blue-200 flex flex-col">
      
      <header className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md shrink-0">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/home')}>
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
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/mis-citas');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Mis Citas
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

      <main className="relative flex-1 overflow-y-auto bg-transparent px-4 pb-8 pt-24 sm:px-6 lg:px-8 flex flex-col">
        <div className="max-w-2xl mx-auto w-full">
          
          <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900">Detalles de la Cita</h1>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="bg-accent px-6 py-8 text-white">
            <div className="flex justify-between items-start gap-4 mb-2">
              <h2 className="text-2xl font-bold capitalize">{cita.especialidad}</h2>
              <div className={`shrink-0 inline-block px-3 py-1 ${color_estado} rounded-full text-sm font-medium`}>
                {texto_estado}
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 text-base font-medium text-white/90 -ml-3">
              <Stethoscope className="w-5 h-5 opacity-80" />
              <span>Dr/Dra. {cita.medico}</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-xl text-primary">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Fecha de la consulta</p>
                <p className="text-lg font-semibold text-slate-900 capitalize">
                  {new Date(cita.fecha_hora).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="flex items-center text-slate-600 mt-1">
                  <Clock className="w-4 h-4 mr-1.5" />
                  <span>{new Date(cita.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} h</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-50 rounded-xl text-primary">
                <NotebookTabs className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Motivo de consulta</p>
                <p className="text-base font-semibold text-slate-900"> {cita.motivo}</p> 
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-50 rounded-xl text-primary">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Consulta</p>
                <p className="text-base font-semibold text-slate-900"> {cita.consulta}</p> 
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
            {esCancelable ? (
              <Button 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={() => setIsCancelModalOpen(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancelar esta Cita
              </Button>
            ) : (
              <span className="text-sm text-slate-500">No puedes cancelar esta cita.</span>
            )}
          </div>

        </div>
        </div>
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

      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 mb-2">¿Cancelar Cita?</h3>
              <p className="text-center text-sm text-slate-500 mb-6">
                Esta acción no se puede deshacer. Tu cita quedará cancelada permanentemente.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={isCancelling}
                >
                  Mantener cita
                </Button>
                <button 
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleCancelarCita}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Cancelando...' : 'Sí, cancelar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};