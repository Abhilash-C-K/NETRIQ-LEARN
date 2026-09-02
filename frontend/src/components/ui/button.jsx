import * as React from 'react';
import { cn } from '../../lib/utils';

const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default:
        'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 shadow-glow-cyan',
      primary:
        'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-glow-cyan',
      destructive:
        'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25',
      outline:
        'border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-slate-100',
      ghost: 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-100',
    };

    const sizes = {
      default: 'h-9 px-4 py-2 text-xs font-mono',
      sm: 'h-8 px-3 text-[11px] font-mono',
      lg: 'h-11 px-8 text-sm font-mono',
      icon: 'h-9 w-9 p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:pointer-events-none disabled:opacity-40 select-none',
          variants[variant] || variants.default,
          sizes[size] || sizes.default,
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
