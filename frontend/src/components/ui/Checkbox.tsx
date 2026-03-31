import React, { forwardRef } from 'react';
import { cn } from '../../utils/tw';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-5 items-center">
          <input
            id={id}
            type="checkbox"
            ref={ref}
            className={cn(
              "h-4 w-4 rounded border-slate-300 bg-white text-primary outline-none transition-all",
              "focus:ring-2 focus:ring-blue-500/20 focus:border-cyan-500",
              "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50",
              className
            )}
            {...props}
          />
        </div>
        <div className="flex flex-col">
          {label && (
            <label htmlFor={id} className="text-sm font-medium text-slate-700 cursor-pointer select-none">
              {label}
            </label>
          )}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';
