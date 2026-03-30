import React, { forwardRef } from 'react';
import { cn } from '../../utils/tw';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, icon, id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={cn(
              "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm transition-all outline-none",
              "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
              "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
              icon && "pl-10",
            )}
            {...props}
          />
        </div>
      </div>
    );
  }
);
Input.displayName = 'Input';