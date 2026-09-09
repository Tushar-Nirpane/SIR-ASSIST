import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'cta' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none shadow-sm cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs sm:text-sm gap-2',
    lg: 'px-6 py-3 text-sm sm:text-base gap-2.5 shadow-md',
  };

  const variantStyles = {
    primary:
      'bg-gov-navy hover:bg-gov-navyDark text-white focus:ring-gov-navy dark:bg-sky-600 dark:hover:bg-sky-500 shadow-md',
    secondary:
      'bg-slate-700 hover:bg-slate-800 text-white focus:ring-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700',
    cta: 'bg-gov-green hover:bg-emerald-700 text-white focus:ring-gov-green shadow-md shadow-emerald-700/20',
    outline:
      'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-gov-navy dark:text-sky-300 focus:ring-gov-navy',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    ghost:
      'text-gov-navy dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-gov-navyDark shadow-none',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-md',
  };

  return (
    <button
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : leftIcon}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
