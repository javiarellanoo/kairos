
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Save, Lock, EyeOff, Eye, MapPin, Stethoscope, Clock, NotebookTabs, Menu, X, Activity, CalendarDays, History, Settings, LogOut } from 'lucide-react';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/tw';

export const PerfilMedico = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [perfil, setPerfil] = useState({
    nombre: '',
    email: '',
    consulta: '',
    especialidad: '',
  });

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    duracion_cita: 30,
  });

  useEffect(() => {
    const fetchPerfil = async () => {
      try {
        const response = await apiClient.get('/doctors/me');
        const data = response.data;
        
        setPerfil({
          nombre: data.name,
          email: data.email,
          consulta: data.consulta,
          especialidad: data.especialidad,
        });

        setFormData({
          phone: data.phone,
          password: '',
          duracion_cita: data.duracion_cita,
        });
      } catch (error) {
        console.error("Error al cargar perfil:", error);
        alert("No se pudo cargar la información del perfil.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerfil();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!/^(?:\+34|0034)?[6789]\d{8}$/.test(formData.phone)) {
      newErrors.phone = "Introduce un número válido.";
    }

    if (formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = "Mínimo 8 caracteres.";
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-=\+\[\]{}|;:'",.<>\?\/])/.test(formData.password)) {
        newErrors.password = "Debe contener mayúsculas, minúsculas, números y símbolos.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);

    const payload: any = {
      phone: formData.phone,
      duracion_cita: formData.duracion_cita,
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      await apiClient.put('/doctors/me', payload);
      alert("¡Perfil actualizado con éxito!");
      navigate('/medico/home');
    } catch (error: any) {
      console.error("Error al guardar perfil:", error);
      alert(error.response?.data?.detail || "Hubo un error al guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Cargando tu perfil...</div>;
  }

  const mockDateStr = import.meta.env.VITE_MOCK_CURRENT_DATE;
  const today = mockDateStr ? new Date(mockDateStr) : new Date();
  const fechaHoy = new Intl.DateTimeFormat('es-ES', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  }).format(today);

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
          <button onClick={() => navigate('/medico/home')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors">
            <CalendarDays className="w-5 h-5" /> Mi Agenda
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors">
            <History className="w-5 h-5" /> Historial
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-teal-500/10 text-teal-400 rounded-xl font-medium transition-colors" onClick={() => navigate('/medico/perfil')} onKeyDown={(e) => { if (e.key === 'Enter') navigate('/medico/perfil'); }}>
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
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        {/* Dashboard Body / Content */}
        <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full pt-8 md:pt-8">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label='Abrir menú de navegación'
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Mi Perfil</h1>
              <p className="text-slate-500 mt-1">Gestiona tu información y tu Agente Kairós</p>
            </div>
          </div>

          <div className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Datos Personales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><User className="w-3 h-3"/> Nombre completo</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{perfil.nombre}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Mail className="w-3 h-3"/> Correo</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{perfil.email}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><MapPin className="w-3 h-3"/> Consulta</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{perfil.consulta}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Stethoscope className="w-3 h-3"/> Especialidad</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{perfil.especialidad}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 italic">
              Para modificar estos datos críticos, por favor contacta con administración.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
            
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" /> Información y Seguridad
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <Input 
                    id="phone" 
                    type="tel" 
                    label="Teléfono de contacto" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    icon={<Phone className="w-5 h-5"/>}
                    error={errors.phone}
                    required 
                  />
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    label="Nueva Contraseña (Opcional)" 
                    value={formData.password} 
                    onChange={handleChange} 
                    icon={<Lock className="w-5 h-5"/>}
                    error={errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[36px] text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <NotebookTabs className="w-5 h-5 text-primary" /> Configuración de Citas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <Input 
                    id="duracion_cita" 
                    type="number" 
                    label="Duración base de la cita (minutos)" 
                    value={formData.duracion_cita.toString()} 
                    onChange={handleChange} 
                    icon={<Clock className="w-5 h-5 text-slate-400"/>}
                    min={1}
                    required 
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Esta es la duración por defecto que Kairós usará para organizar tu agenda a partir de ahora.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary" className="w-full sm:w-auto shadow-md" isLoading={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </Button>
            </div>

          </form>
        </div>
      </div>
      </main>
    </div>
  );
};