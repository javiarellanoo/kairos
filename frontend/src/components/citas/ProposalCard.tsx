import React from 'react';
import { Bot, ArrowRight, Check } from 'lucide-react';
import { apiClient } from '../../api/client';
import { CitaType } from './AppointmentCard';

interface ProposalCardProps {
  appointment: CitaType;
  onResolve: () => void;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({ appointment, onResolve }) => {
  const dateObj = new Date(appointment.fecha_hora);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
  const time = dateObj.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const handleDecision = async (decision: 'aceptar' | 'rechazar') => {
    try {
      await apiClient.post(`/adelantar-cita/${appointment.id}`, { decision });
      onResolve();
    } catch (error) {
      console.error('Error with relative decision:', error);
    }
  };

  return (
    <div className="rounded-3xl bg-[#1e3a8a] p-5 sm:p-6 shadow-xl w-full shrink-0">
      <div className="flex items-center gap-3">
        <div className="bg-white/10 p-1.5 rounded-lg">
          <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-pink-300" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-white">Tu Agente tiene una propuesta</h2>
        <span className="ml-auto sm:ml-2 bg-[#06b6d4] text-cyan-950 text-[10px] sm:text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
          Oportunidad
        </span>
      </div>
      
      <p className="mt-4 text-sm sm:text-base text-blue-100 max-w-xl text-left">
        ¡Buenas noticias! Se ha liberado un hueco en <strong className="text-white">{appointment.especialidad}</strong> que encaja con tu disponibilidad.
      </p>

      <div className="bg-[#2d4b9f] rounded-2xl p-4 sm:p-5 mt-5 flex items-center justify-between relative overflow-hidden">
        <div className="text-center relative z-10 flex-1">
          <p className="text-xs sm:text-sm font-medium text-blue-200 mb-1">Original</p>
          <p className="text-lg sm:text-2xl font-black text-white">N/A</p>
        </div>
        
        <div className="relative z-10 px-2 sm:px-4">
          <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-[#06b6d4]" />
        </div>

        <div className="text-center relative z-10 flex-1">
          <p className="text-xs sm:text-sm font-medium text-[#06b6d4] mb-1">Nuevo Hueco</p>
          <p className="text-lg sm:text-2xl font-black text-white">{day} {month}</p>
          <p className="text-xs sm:text-sm text-blue-200 mt-1">{time}h</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <button 
          onClick={() => handleDecision('rechazar')}
          className="flex-1 rounded-xl border border-white/20 bg-transparent py-2.5 sm:py-3 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
        >
          Rechazar
        </button>
        <button 
          onClick={() => handleDecision('aceptar')}
          className="flex-1 rounded-xl bg-[#06b6d4] py-2.5 sm:py-3 text-sm font-bold text-slate-900 hover:bg-cyan-300 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/20"
        >
          <Check className="h-4 w-4 sm:h-5 sm:w-5" />
          Aceptar Cambio
        </button>
      </div>
    </div>
  );
};