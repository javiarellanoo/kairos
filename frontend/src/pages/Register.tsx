import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, User, Mail, Lock, Phone, ArrowLeft, Check, CalendarDays, ShieldCheck, IdCard, CreditCard, InfoIcon, Calendar } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Checkbox } from "../components/ui/Checkbox";
import { apiClient } from "../api/client";
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

export const Register = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        dni: "",
        birth_date: "",
        tarjeta_sanitaria: "",
        preferencias_horarias: {
        lunes: [] as Turno[],
        martes: [] as Turno[],
        miercoles: [] as Turno[],
        jueves: [] as Turno[],
        viernes: [] as Turno[]
        }
    });

    const validateStep1 = () => {
      const newErrors: Record<string, string> = {};

      if (!/^\d{8}[A-Za-z]$/.test(formData.dni)) {
        newErrors.dni = "El DNI debe tener 8 números y una letra.";
      }

      if (!/^[A-Z]{2} \d{10}$/.test(formData.tarjeta_sanitaria)) {
        newErrors.tarjeta_sanitaria = "Formato inválido. Ejemplo: AN 1234567890";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
      const newErrors: Record<string, string> = {};

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Introduce un correo válido.";
      }

      if (!/^(?:\+34|0034)?[6789]\d{8}$/.test(formData.phone)) {
        newErrors.phone = "Introduce un número de teléfono válido.";
      }

      if (formData.password.length < 8) {
        newErrors.password = "La contraseña debe tener al menos 8 caracteres.";
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-=\+\[\]{}|;:'",.<>\?\/])/.test(formData.password)) {
        newErrors.password = "Debe contener mayúsculas, minúsculas, números y símbolos.";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (e.target.id === 'dni' || e.target.id === 'tarjeta_sanitaria') {
        value = value.toUpperCase();
        }
        if (e.target.id === 'phone') {
            value = value.replace(/[^+\d]/g, '');
        }
        setFormData((prev) => ({ ...prev, [e.target.id]: value }));
    };
    const togglePreference = (dayKey: DiaSemana, shiftValue: Turno) => {
        setFormData(prev => {
        const currentDayPrefs = prev.preferencias_horarias[dayKey];
        const hasShift = currentDayPrefs.includes(shiftValue);
        const newDayPrefs = hasShift 
            ? currentDayPrefs.filter(s => s !== shiftValue) 
            : [...currentDayPrefs, shiftValue];
        return {
            ...prev,
            preferencias_horarias: {
            ...prev.preferencias_horarias,
            [dayKey]: newDayPrefs
            }
        };
        });
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (step === 1) {
        if (validateStep1()) {
          setStep(2);
        }
      } else if (step === 2) {
        if (validateStep2()) {
          setStep(3);
        }
      } else {
        setIsLoading(true);

       try {
          const response = await apiClient.post('/signup', formData);

          console.log("Respuesta del servidor:", response.data);

          setIsLoading(false);
          alert('¡Registro completado con éxito!');
          navigate('/login');
          
        } catch (error: any) {
            console.error('Error durante el registro:', error);
            setIsLoading(false);
            const errorMessage = error.response?.data?.detail || 'Error al registrarse. Por favor, verifica tus datos e inténtalo de nuevo.';
            alert(`Error: ${errorMessage}`);
        }
      }
    };

    return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans sm:px-6 lg:px-8 py-10">
      
      <button 
        onClick={() => step === 1 ? navigate('/') : setStep(1)}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {step === 1 ? 'Volver al inicio' : 'Volver al paso anterior'}
      </button>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-xl bg-primary p-3 shadow-lg shadow-primary/20 mb-4">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Únete a Kairós
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {step === 1 ? 'Paso 1: Tus datos personales' : step ===2 ? 'Paso 2: Tus datos de acceso' : 'Paso 3: Indica tu disponibilidad'}
          </p>
        </div>

        <div className="mt-8 mb-10 px-4 max-w-sm mx-auto">
          <div className="relative flex justify-between items-center">
            {/* Barra de fondo */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] bg-slate-200 z-0"></div>
            
            {/* Barra de progreso (fill) */}
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-[4px] bg-primary z-0 transition-all duration-500"
              style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }} 
            ></div>
            
            {/* Indicadores de paso */}
            {[1, 2, 3].map((num) => {
              const isActive = step === num;
              const isCompleted = step > num;
              
              return (
                <div
                  key={num}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-all duration-300 border-[3px]",
                    isCompleted 
                      ? "bg-primary border-primary text-white"
                      : isActive 
                        ? "bg-blue-50 border-primary text-primary"
                        : "bg-white border-slate-200 text-slate-400"
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : num}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          
          <form onSubmit={handleFormSubmit}>
            
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Input name="name" id="name" label="Nombre completo" placeholder="Juan Pérez" icon={<User className="w-5 h-5"/>} value={formData.name} onChange={handleChange} required />
                
                <Input name="dni" id="dni" label="DNI" placeholder="12345678Z" icon={<IdCard className="w-5 h-5"/>} value={formData.dni} onChange={handleChange} error={errors.dni} required />
                <div className="pt-2">
                <Input name="tarjeta_sanitaria" id="tarjeta_sanitaria" label="Tarjeta sanitaria" placeholder="123456789" icon={<CreditCard className="w-5 h-5"/>} value={formData.tarjeta_sanitaria} onChange={handleChange} error={errors.tarjeta_sanitaria} required />
                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                    <InfoIcon className="w-3 h-3" /> Lo encontrarás en el anverso de tu tarjeta sanitaria.
                  </p>
                </div>
                  <Input name="birth_date" id="birth_date" type="date" label="Fecha de nacimiento" placeholder="1990-01-01" icon={<Calendar className="w-5 h-5"/>} value={formData.birth_date} onChange={handleChange} required />

                <div className="pt-4">
                  <Button type="submit" variant="primary" className="w-full py-3 text-base">
                    Siguiente paso
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Input name="email" id="email" label="Correo electrónico" placeholder="juan@ejemplo.com" icon={<Mail className="w-5 h-5"/>} onChange={handleChange} error={errors.email} required />
                <Input name="phone" id="phone" type="tel" label="Teléfono móvil" placeholder="+34 600 000 000" icon={<Phone className="w-5 h-5"/>} value={formData.phone} onChange={handleChange} error={errors.phone} required />

                <div className="pt-2">
                  <Input name="password" id="password" type="password" label="Contraseña" placeholder="••••••••" icon={<Lock className="w-5 h-5"/>} value={formData.password} onChange={handleChange} error={errors.password} required />
                  <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Mínimo 8 caracteres, números y símbolos.
                  </p>
                </div>

                <Checkbox name="terms" id="terms" label="Autorizo al sistema a procesar mis datos personales y a negociar citas en mi nombre basándose en mi disponibilidad" required />

                <div className="pt-4">
                  <Button type="submit" variant="primary" className="w-full py-3 text-base">
                    Siguiente paso
                  </Button>
                </div>
              </div>
            )}

            {/* PASO 3: CONFIGURACIÓN DEL AGENTE */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                  <CalendarDays className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-900">Indícanos tu disponibilidad</h4>
                    <p className="text-sm text-cyan-700 mt-1 leading-relaxed">
                      Indica en qué franjas horarias prefieres que tu agente agende tus próximas citas.
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-6 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="p-3 text-center border-r border-slate-200">Turno</div>
                    {DAYS.map(day => (
                      <div key={day.key} className="p-3 text-center truncate" title={day.label}>
                        {day.label.substring(0, 3)}
                      </div>
                    ))}
                  </div>

                  {/* Fila Mañanas */}
                  <div className="grid grid-cols-6 border-b border-slate-100">
                    <div className="p-3 bg-slate-50 border-r border-slate-200 text-sm font-medium text-slate-700 flex items-center justify-center">
                      Mañana
                    </div>
                    {DAYS.map(day => {
                      const isSelected = formData.preferencias_horarias[day.key as DiaSemana].includes('M');
                      return (
                        <div 
                          key={`m-${day.key}`}
                          onClick={() => togglePreference(day.key as DiaSemana, 'M')}
                          className={cn(
                            "p-3 border-r border-slate-100 last:border-0 cursor-pointer transition-all flex justify-center items-center group",
                            isSelected ? "bg-teal-50" : "hover:bg-slate-50"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-md border flex items-center justify-center transition-all",
                            isSelected ? "bg-teal-500 border-teal-500 text-white" : "border-slate-300 group-hover:border-teal-300"
                          )}>
                            {isSelected && <Check className="w-4 h-4" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Fila Tardes */}
                  <div className="grid grid-cols-6">
                    <div className="p-3 bg-slate-50 border-r border-slate-200 text-sm font-medium text-slate-700 flex items-center justify-center">
                      Tarde
                    </div>
                    {DAYS.map(day => {
                      const isSelected = formData.preferencias_horarias[day.key as DiaSemana].includes('T');
                      return (
                        <div 
                          key={`t-${day.key}`}
                          onClick={() => togglePreference(day.key as DiaSemana, 'T')}
                          className={cn(
                            "p-3 border-r border-slate-100 last:border-0 cursor-pointer transition-all flex justify-center items-center group",
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

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3">
                    Atrás
                  </Button>
                  <Button type="submit" variant="primary" className="w-2/3 shadow-md" isLoading={isLoading}>
                    Finalizar Registro
                  </Button>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}