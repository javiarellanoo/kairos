import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarRange, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Info,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/tw';

interface Turno {
  inicio: string;
  fin: string;
}

export const AbrirAgenda = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

  const [mesActual, setMesActual] = useState(new Date());
  const [turnosPorDia, setTurnosPorDia] = useState<Record<string, Turno[]>>({});
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [ultimoDiaAgenda, setUltimoDiaAgenda] = useState<Date | null>(null);

  const getUltimoDiaAgenda = async () => {
    try {
      const response = await apiClient.get('/doctors/me/ultimo-dia-agenda');
        setUltimoDiaAgenda(new Date(response.data.ultimo_dia));
    } catch (error) {
      console.error("Error al obtener el último día de la agenda:", error);
    }
  };

  useEffect(() => {
    getUltimoDiaAgenda();
    }, []);

  const diasMes = useMemo(() => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    const primerDia = new Date(year, month, 1).getDay();
    const diasEnMes = new Date(year, month + 1, 0).getDate();

    let celdasVacias = 0;
    if (primerDia >= 1 && primerDia <= 5) {
      celdasVacias = primerDia - 1;
    } else if (primerDia === 6 || primerDia === 0) {
      celdasVacias = 0;
    }

    const celdas: (Date | null)[] = Array(celdasVacias).fill(null);

    for (let i = 1; i <= diasEnMes; i++) {
      const d = new Date(year, month, i);
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) {
        celdas.push(d);
      }
    }
    return celdas;
  }, [mesActual]);

  const cambiarMes = (incremento: number) => {
    const nuevoMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + incremento, 1);
    setMesActual(nuevoMes);
    setFechaSeleccionada(null);
  };

const formatearFecha = (fecha: Date) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0'); 
    const day = String(fecha.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const isDiaBloqueado = (fecha: Date) => {
    if (!ultimoDiaAgenda) return false;
    const fechaEvaluar = new Date(fecha);
    fechaEvaluar.setHours(0, 0, 0, 0);
    return fechaEvaluar <= ultimoDiaAgenda;
  };

  const handleSeleccionarDia = (fecha: Date) => {
    if (isDiaBloqueado(fecha)) return;

    const fechaStr = formatearFecha(fecha);
    setFechaSeleccionada(fechaStr);
    
    if (!turnosPorDia[fechaStr] || turnosPorDia[fechaStr].length === 0) {
      setTurnosPorDia(prev => ({
        ...prev,
        [fechaStr]: [{ inicio: '08:00', fin: '15:00' }]
      }));
    }
  };

  const turnosDiaSeleccionado = fechaSeleccionada ? turnosPorDia[fechaSeleccionada] || [] : [];

  const addTurno = () => {
    if (!fechaSeleccionada) return;
    setTurnosPorDia(prev => ({
      ...prev,
      [fechaSeleccionada]: [...(prev[fechaSeleccionada] || []), { inicio: '16:00', fin: '20:00' }]
    }));
  };

  const updateTurno = (indexTurno: number, campo: 'inicio' | 'fin', valor: string) => {
    if (!fechaSeleccionada) return;
    const nuevosTurnos = [...turnosDiaSeleccionado];
    nuevosTurnos[indexTurno][campo] = valor;
    setTurnosPorDia(prev => ({ ...prev, [fechaSeleccionada]: nuevosTurnos }));
  };

  const removeTurno = (indexTurno: number) => {
    if (!fechaSeleccionada) return;
    const nuevosTurnos = [...turnosDiaSeleccionado];
    nuevosTurnos.splice(indexTurno, 1);
    
    if (nuevosTurnos.length === 0) {
      const copia = { ...turnosPorDia };
      delete copia[fechaSeleccionada];
      setTurnosPorDia(copia);
    } else {
      setTurnosPorDia(prev => ({ ...prev, [fechaSeleccionada]: nuevosTurnos }));
    }
  };

  const vaciarDia = () => {
    if (!fechaSeleccionada) return;
    const copia = { ...turnosPorDia };
    delete copia[fechaSeleccionada];
    setTurnosPorDia(copia);
    setFechaSeleccionada(null);
  };

  const handleSubmit = async () => {
    setErrorBackend(null);

    const agendaPayload: Record<string, string[]> = {};
    
    Object.entries(turnosPorDia).forEach(([fechaStr, turnos]) => {
      if (turnos.length > 0) {
        agendaPayload[fechaStr] = turnos.map(t => `${t.inicio}-${t.fin}`);
      }
    });

    if (Object.keys(agendaPayload).length === 0) {
      setErrorBackend("No has configurado ningún turno en el calendario.");
      return;
    }

    setIsLoading(true);
    try {
        console.log("Payload a enviar al backend:", agendaPayload);
      await apiClient.patch('/doctors/me/agenda', agendaPayload);
      setIsSuccess(true);
      setTimeout(() => navigate('/medico/home'), 3000);
    } catch (error: any) {
      console.error("Error al guardar la agenda:", error);
      setErrorBackend(error.response?.data?.detail || "Hubo un error al procesar tu solicitud.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full animate-in zoom-in duration-500">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Agenda Abierta!</h2>
          <p className="text-slate-600 mb-6">Tu nueva disponibilidad ha sido guardada correctamente en el sistema.</p>
          <div className="animate-pulse text-sm text-primary font-medium">Volviendo a tu panel...</div>
        </div>
      </div>
    );
  }

  const nombreMes = mesActual.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/medico/home')}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                <CalendarRange className="w-8 h-8 text-primary" /> Planificar Agenda
              </h1>
              <p className="text-slate-500 mt-1">Configura tu disponibilidad día a día.</p>
            </div>
          </div>
          
          <Button 
            onClick={handleSubmit}
            variant="primary" 
            isLoading={isLoading}
            className="hidden sm:flex bg-primary hover:bg-cyan-700 shadow-md py-2.5 px-6"
          >
            <Save className="w-5 h-5 mr-2" /> Guardar Agenda
          </Button>
        </div>

        {errorBackend && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{errorBackend}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMNA IZQUIERDA: Calendario */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            {/* Navegación del mes */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 capitalize">{nombreMes}</h2>
              <div className="flex gap-2">
                <button onClick={() => cambiarMes(-1)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <button onClick={() => cambiarMes(1)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Cabecera Días (L-V) */}
            <div className="grid grid-cols-5 gap-2 mb-2 text-center">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map(dia => (
                <div key={dia} className="text-xs font-bold text-slate-500 uppercase tracking-wider">{dia}</div>
              ))}
            </div>

            {/* Cuadrícula de Días */}
            <div className="grid grid-cols-5 gap-2">
              {diasMes.map((fecha, idx) => {
                if (!fecha) {
                  return <div key={`empty-${idx}`} className="h-24 bg-transparent rounded-xl" />;
                }

                const fechaStr = formatearFecha(fecha);
                const isSelected = fechaSeleccionada === fechaStr;
                const turnos = turnosPorDia[fechaStr];
                const hasTurnos = turnos && turnos.length > 0;
                
                // Determinamos si este día específico está bloqueado
                const bloqueado = isDiaBloqueado(fecha);

                return (
                  <button
                    key={fechaStr}
                    onClick={() => handleSeleccionarDia(fecha)}
                    disabled={bloqueado}
                    className={cn(
                      "h-24 flex flex-col items-start p-3 rounded-xl border transition-all text-left relative focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2",
                      
                      bloqueado && "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed",
                      
                      !bloqueado && !isSelected && "border-slate-200 hover:border-teal-300 hover:bg-slate-50",
                      !bloqueado && isSelected && "border-teal-500 ring-2 ring-teal-500 ring-opacity-50 bg-teal-50",
                      !bloqueado && hasTurnos && !isSelected && "bg-teal-50/30 border-teal-200"
                    )}
                  >
                    <div className="flex justify-between w-full items-center mb-1">
                      <span className={cn(
                        "text-sm font-semibold",
                        bloqueado ? "text-slate-400" : hasTurnos ? "text-teal-700" : "text-slate-600"
                      )}>
                        {fecha.getDate()}
                      </span>
                      {bloqueado && <Lock className="w-3 h-3 text-slate-400" />}
                    </div>
                    
                    {/* Indicadores de turno (solo si los acabamos de añadir nosotros) */}
                    {!bloqueado && hasTurnos && (
                      <div className="flex flex-col gap-1 w-full mt-auto">
                        {turnos.map((t, i) => (
                          <div key={i} className="text-[10px] leading-tight font-medium bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded truncate w-full">
                            {t.inicio}-{t.fin}
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* COLUMNA DERECHA: Editor del Día */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8">
              {!fechaSeleccionada ? (
                <div className="text-center py-12 px-4">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Ningún día seleccionado</h3>
                  <p className="text-sm text-slate-500">Haz clic en cualquier día disponible del calendario para configurar su horario.</p>
                </div>
              ) : (
                <div className="animate-in fade-in">
                  <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {new Date(fechaSeleccionada).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Configura las horas de este día</p>
                    </div>
                  </div>

                  {turnosDiaSeleccionado.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-slate-500 mb-4">Día sin turnos asignados.</p>
                      <Button variant="outline" onClick={addTurno} className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> Añadir primer turno
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {turnosDiaSeleccionado.map((turno, indexTurno) => (
                        <div key={indexTurno} className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <input 
                            type="time" 
                            required
                            aria-label= {`Hora de inicio del turno ${indexTurno + 1}`}
                            value={turno.inicio}
                            onChange={(e) => updateTurno(indexTurno, 'inicio', e.target.value)}
                            className="w-full bg-white px-2 py-1.5 rounded-md border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                          />
                          <span className="text-slate-400">-</span>
                          <input 
                            type="time" 
                            required
                            aria-label= {`Hora de fin del turno ${indexTurno + 1}`}
                            value={turno.fin}
                            onChange={(e) => updateTurno(indexTurno, 'fin', e.target.value)}
                            className="w-full bg-white px-2 py-1.5 rounded-md border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                          />
                          <button 
                            type="button"
                            onClick={() => removeTurno(indexTurno)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      <button 
                        type="button"
                        onClick={addTurno}
                        className="text-sm text-primary font-semibold flex items-center gap-1 w-full justify-center py-2 hover:bg-teal-50 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Añadir otro turno
                      </button>

                      <div className="pt-4 border-t border-slate-100">
                        <button
                          onClick={vaciarDia}
                          className="text-sm text-red-600 hover:text-red-700 w-full text-center p-2"
                        >
                          Limpiar este día
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="sm:hidden fixed bottom-4 left-4 right-4 z-10">
            <Button 
              onClick={handleSubmit}
              variant="primary" 
              isLoading={isLoading}
              className="w-full bg-primary shadow-xl py-3 text-lg"
            >
              <Save className="w-5 h-5 mr-2" /> Guardar Agenda
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};