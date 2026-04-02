import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Stethoscope, FileText, CheckCircle2, Loader2, Activity, LucideBellDot, User, ChevronDown, LogOut, Calendar } from 'lucide-react';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export const NuevaCita = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const handleOpenMenu = () => setIsMenuOpen(!isMenuOpen);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [especialidades, setEspecialidades] = useState<string[]>(["Medicina General"]);
  
  const [formData, setFormData] = useState({
    especialidad: "Medicina General",
    motivo: "Consulta general",
    id_volante: "",
    lista_espera: false
  });

  const requiereVolante = formData.especialidad !== "Medicina General" && formData.especialidad !== "Pediatría";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData({ ...formData, [target.id || target.name]: value });
  };

  useEffect(() => {
    const fetchEspecialidades = async () => {
      try {
        const res = await apiClient.get('/especialidades');
        setEspecialidades(res.data.map((item: any) => item.nombre));
      } catch (error) {
        console.error("Error al obtener especialidades:", error);
      }
    };
    fetchEspecialidades();
  }, []);

  useEffect(() => {
    const fetchVolante = async () => {
      if (requiereVolante) {
        try {
          const response = await apiClient.get(`/volantes/especialidad/${formData.especialidad}`);
          if (response.data && response.data.length > 0) {
            const volante = response.data[0];
            setFormData(prev => ({ ...prev, id_volante: volante.id, motivo: volante.motivo }));
          } else {
            setFormData(prev => ({ ...prev, id_volante: "", motivo: "Sin volante disponible" }));
          }
        } catch (error) {
          console.error("Error al obtener volante:", error);
          setFormData(prev => ({ ...prev, id_volante: "", motivo: "Error al cargar volante" }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          id_volante: "",
          motivo: ["Consulta general", "Revisión de analíticas", "Renovación de medicación"].includes(prev.motivo) ? prev.motivo : "Consulta general"
        }));
      }
    };
    fetchVolante();
  }, [formData.especialidad, requiereVolante]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (requiereVolante && !formData.id_volante) {
      alert("No se encontró un volante válido para esta especialidad.");
      setIsLoading(false);
      return;
    }

    try {
      await apiClient.post('/nueva-cita', {
        especialidad: formData.especialidad,
        motivo: requiereVolante ? null : formData.motivo,
        id_volante: requiereVolante ? formData.id_volante : null,
        lista_espera: formData.lista_espera
      });
      
      setIsSuccess(true);
      setTimeout(() => navigate('/mis-citas'), 3000);
      
    } catch (error: any) {
      console.error("Error al solicitar cita:", error);
      alert(error.response?.data?.detail || "Hubo un error al procesar tu solicitud.");
      setIsLoading(false);
    }
  };

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
                    navigate('/mi-perfil');
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
        
        {isSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">¡Solicitud Enviada!</h2>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Tu Agente Kairós ya se ha despertado y está negociando con los médicos de <strong>{formData.especialidad}</strong> para conseguirte la mejor cita posible.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirigiendo a tus citas...
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-8">
              <button 
                onClick={() => navigate('/home')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Volver al panel principal"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900">Solicitar Nueva Cita</h1>
                <p className="text-slate-500 mt-1">Dinos qué necesitas y Kairós se encargará del resto.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="w-full flex flex-col gap-1.5 text-left">
                  <label htmlFor="especialidad" className="text-sm font-medium text-slate-700">
                    ¿Qué especialidad necesitas?
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <select
                      id="especialidad"
                      value={formData.especialidad}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pl-10 pr-10 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                      required
                    >
                      {especialidades.map(esp => (
                        <option key={esp} value={esp}>{esp}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {requiereVolante && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                      <p className="text-sm text-amber-800 font-medium">
                        Para los especialistas necesitas una derivación previa.
                      </p>
                    </div>
                    <div className="w-full flex flex-col gap-1.5 text-left mb-6">
                      <label htmlFor="id_volante" className="text-sm font-medium text-slate-700">
                        Código del Volante Médico
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <FileText className="w-5 h-5"/>
                        </div>
                        <input 
                          id="id_volante" 
                          value={formData.id_volante || (formData.motivo === "Error al cargar volante" ? "No se pudo recuperar el volante" : "Buscando...")}
                          readOnly
                          className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 pl-10 text-sm text-slate-500 transition-all outline-none cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="w-full flex flex-col gap-1.5 text-left">
                  <label htmlFor="motivo" className="text-sm font-medium text-slate-700">
                    {requiereVolante ? "Motivo del volante" : "Motivo de la consulta"}
                  </label>
                  {!requiereVolante ? (
                    <div className="relative">
                      <select
                        id="motivo"
                        value={formData.motivo}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-10 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                        required
                      >
                        <option value="Consulta general">Consulta general</option>
                        <option value="Revisión de analíticas">Revisión de analíticas</option>
                        <option value="Renovación de medicación">Renovación de medicación</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </div>
                  ) : (
                    <input
                      id="motivo"
                      value={formData.motivo || "..."}
                      readOnly
                      className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none cursor-not-allowed"
                    />
                  )}
                </div>

                <div className="w-full flex flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-primary/20 p-2 rounded-md">
                  <div className="flex flex-col text-left">
                    <label htmlFor="lista_espera" className="text-sm font-bold text-slate-900 cursor-pointer select-none" onClick={() => setFormData({ ...formData, lista_espera: !formData.lista_espera })}>
                      Lista de Espera
                    </label>
                    <p className="text-xs text-slate-800 mt-1 max-w-[240px] sm:max-w-xs ">
                      ¿Quieres que Kairós te avise si se libera un hueco antes de tu cita?
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    role="switch"
                    id="lista_espera"
                    aria-checked={formData.lista_espera}
                    onClick={() => setFormData({ ...formData, lista_espera: !formData.lista_espera })}
                    className={`relative inline-flex h-7 w-[52px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      formData.lista_espera ? 'bg-primary' : 'bg-slate-400'
                    }`}
                  >
                    <span className="sr-only">Activar lista de espera inteligente</span>
                    <span 
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.lista_espera ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Button type="submit" variant="dark" className="w-full py-3 text-base shadow-md" isLoading={isLoading}>
                    Buscar Cita con Kairós
                  </Button>
                </div>

              </form>
            </div>
          </div>
        )}
        
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