import React, { forwardRef } from 'react';
import { cn } from '../../utils/tw';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, icon, id, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <div className="relative">
          {icon && (
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2",
              error ? "text-red-400" : "text-slate-400"
            )}>
              {icon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              "w-full rounded-lg border bg-white px-4 py-2.5 text-sm transition-all outline-none",
              icon && "pl-10",
              error 
                ? "border-red-500 focus:ring-2 focus:ring-red-500/20 text-red-900 placeholder:text-red-300" 
                : "border-slate-300 focus:border-primary focus:ring-2 focus:ring-blue-500/20",
              className
            )}
            {...props}
          />
        </div>
        {error && <span className="text-xs font-medium text-red-500 mt-0.5">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';