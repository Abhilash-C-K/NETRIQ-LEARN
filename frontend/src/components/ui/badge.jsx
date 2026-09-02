import * as React from 'react';
import { cn } from '../../lib/utils';

function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'border-slate-700 bg-slate-800 text-slate-200',
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    rose: 'border-rose-500/40 bg-rose-500/15 text-rose-400',
    outline: 'border-slate-800 text-slate-400',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 uppercase tracking-wide',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
