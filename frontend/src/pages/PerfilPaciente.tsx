// src/pages/PerfilPaciente.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Check, CalendarDays, Mail, Save, CreditCard, Hash, Lock, EyeOff, Eye } from 'lucide-react';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn } from '../utils/tw';

const DAYS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' }
];

type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes';
type Turno = 'M' | 'T';

export const PerfilPaciente = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [perfil, setPerfil] = useState({
    nombre: '',
    email: '',
    dni: '',
    tarjeta_sanitaria: '',
  });

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    preferencias_horarias: {
      lunes: [] as Turno[],
      martes: [] as Turno[],
      miercoles: [] as Turno[],
      jueves: [] as Turno[],
      viernes: [] as Turno[]
    }
  });

  useEffect(() => {
    const fetchPerfil = async () => {
      try {
        const response = await apiClient.get('/pacientes/me');
        const data = response.data;
        
        setPerfil({
          nombre: data.name,
          email: data.email,
          dni: data.dni,
          tarjeta_sanitaria: data.tarjeta_sanitaria,
        });

        setFormData({
          phone: data.phone,
          password: '',
          preferencias_horarias: data.preferencias_horarias,
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

  const togglePreference = (dayKey: DiaSemana, shiftValue: Turno) => {
    setFormData(prev => {
      const currentDayPrefs = prev.preferencias_horarias[dayKey] || [];
      const hasShift = currentDayPrefs.includes(shiftValue);
      const newDayPrefs = hasShift 
        ? currentDayPrefs.filter(s => s !== shiftValue) 
        : [...currentDayPrefs, shiftValue];

      return { ...prev, preferencias_horarias: { ...prev.preferencias_horarias, [dayKey]: newDayPrefs } };
    });
  };

  const handleGridKeyDown = (e: React.KeyboardEvent, dayKey: DiaSemana, shift: Turno) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePreference(dayKey, shift);
    }
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
      preferencias_horarias: formData.preferencias_horarias,
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      await apiClient.put('/pacientes/me', payload);
      alert("¡Perfil actualizado con éxito!");
      navigate('/home');
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/home')}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Volver al panel principal"
          >
            <ArrowLeft className="w-6 h-6" />
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
                <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Hash className="w-3 h-3"/> DNI</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{perfil.dni}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><CreditCard className="w-3 h-3"/> Tarjeta Sanitaria</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{perfil.tarjeta_sanitaria}</p>
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
                    label="Teléfono Móvil" 
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

            <div>
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-cyan-100 text-primary rounded-lg">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Tu Disponibilidad</h2>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    Actualiza tu disponibilidad. Tu Agente Kairós solo te buscará citas dentro de estos turnos.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
                <div className="grid grid-cols-6 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <div className="p-3 text-center border-r border-slate-200">Turno</div>
                  {DAYS.map(day => (
                    <div key={day.key} className="p-3 text-center truncate">{day.label.substring(0, 3)}</div>
                  ))}
                </div>

                <div className="grid grid-cols-6 border-b border-slate-100">
                  <div className="p-3 bg-slate-50 border-r border-slate-200 text-sm font-medium text-slate-700 flex items-center justify-center">Mañana</div>
                  {DAYS.map(day => {
                    const isSelected = formData.preferencias_horarias[day.key as DiaSemana]?.includes('M');
                    return (
                      <div 
                        key={`m-${day.key}`}
                        onClick={() => togglePreference(day.key as DiaSemana, 'M')}
                        onKeyDown={(e) => handleGridKeyDown(e, day.key as DiaSemana, 'M')}
                        role="button" tabIndex={0}
                        aria-label={`Turno de mañana el ${day.label}. ${isSelected ? 'Seleccionado' : 'No seleccionado'}`}
                        className={cn(
                          "p-3 border-r border-slate-100 last:border-0 cursor-pointer transition-all flex justify-center items-center group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500",
                          isSelected ? "bg-teal-50" : "hover:bg-slate-50"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-md border flex items-center justify-center transition-all",
                          isSelected ? "bg-teal-500 border-teal-500 text-white" : "border-slate-300 group-hover:border-teal-500"
                        )}>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-6">
                  <div className="p-3 bg-slate-50 border-r border-slate-200 text-sm font-medium text-slate-700 flex items-center justify-center">Tarde</div>
                  {DAYS.map(day => {
                    const isSelected = formData.preferencias_horarias[day.key as DiaSemana]?.includes('T');
                    return (
                      <div 
                        key={`t-${day.key}`}
                        onClick={() => togglePreference(day.key as DiaSemana, 'T')}
                        onKeyDown={(e) => handleGridKeyDown(e, day.key as DiaSemana, 'T')}
                        role="button" tabIndex={0}
                        aria-label={`Turno de tarde el ${day.label}. ${isSelected ? 'Seleccionado' : 'No seleccionado'}`}
                        className={cn(
                          "p-3 border-r border-slate-100 last:border-0 cursor-pointer transition-all flex justify-center items-center group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary",
                          isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-md border flex items-center justify-center transition-all",
                          isSelected ? "bg-primary border-primary text-white" : "border-slate-300 group-hover:border-primary"
                        )}>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </div>
                    );
                  })}
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
    </div>
  );
};