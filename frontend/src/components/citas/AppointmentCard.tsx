import React from 'react';

export interface CitaType {
  id: number;
  especialidad: string;
  fecha_hora: string;
  estado: string;
  medico: string;
  consulta: string;
}

interface AppointmentCardProps {
  appointment: CitaType;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment }) => {
  const dateObj = new Date(appointment.fecha_hora);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
  const time = dateObj.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const isConfirmed = appointment.estado === 'confirmada';
  
  return (
    <div className="flex items-center gap-3 sm:gap-4 rounded-[2rem] border border-slate-900 bg-white p-2.5 sm:p-3 shadow-sm hover:shadow-md transition-shadow shrink-0">
      <div className="flex flex-col items-center justify-center rounded-[1.5rem] bg-[#f1f5f9] min-w-[4.5rem] sm:min-w-[5.5rem] h-[4.5rem] sm:h-[5.5rem] shrink-0">
        <span className="text-lg sm:text-xl font-black text-slate-900 leading-none">{day}</span>
        <span className="text-[10px] sm:text-xs font-semibold text-slate-600 mt-1">{month}</span>
      </div>
      
      <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 overflow-hidden pr-2 sm:pr-4">
        <div className="truncate text-left">
          <h3 className="text-sm sm:text-[17px] font-bold text-[#0f172a] truncate mb-1">{appointment.especialidad}</h3>
          <p className="text-xs sm:text-[15px] text-[#334155] truncate">{time} h - {appointment.medico} - {appointment.consulta}</p>
        </div>
        
        <div className="shrink-0 text-left sm:text-right">
          {isConfirmed ? (
            <span className="inline-flex items-center rounded-lg bg-[#dafbab] px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm font-bold text-[#2c5f15]">
              Confirmada
            </span>
          ) : (
            <span className="inline-flex items-center rounded-lg bg-[#fef0c7] px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm font-bold text-[#865910]">
              En lista de espera
            </span>
          )}
        </div>
      </div>
    </div>
  );
};