import React, { forwardRef } from 'react';
import { cn } from '../../utils/tw';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, children, ...props }, ref) => {
    const variants = {
      primary: "bg-[var(--color-primary)] text-white hover:brightness-95 shadow-sm",
      outline: "border-2 border-slate-200 bg-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
      dark: "bg-[var(--color-accent)] text-white hover:brightness-95 shadow-sm",
      options: "bg-transparent text-slate-700 text-sm font-medium border-2 border-accent rounded-full px-3 ",
      options_dark: "bg-accent text-white text-sm font-medium border-2 border-accent rounded-full px-3 "
    };

    return (
      <button
        ref={ref}
        aria-busy={isLoading}
        disabled={isLoading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all outline-none",
          "focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';