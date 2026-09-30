import * as React from 'react';
import { cn } from '../../lib/utils';

function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'border-[#303334] bg-[#252728] text-[#A4A5A0]',
    outline: 'border-[#303334] bg-transparent text-[#A4A5A0]',
    healthy: 'border-[#9AAA78]/40 bg-[#9AAA78]/15 text-[#9AAA78]',
    info: 'border-[#8CA4B8]/40 bg-[#8CA4B8]/15 text-[#8CA4B8]',
    warning: 'border-[#D0A05C]/40 bg-[#D0A05C]/15 text-[#D0A05C]',
    critical: 'border-[#C95F5F]/40 bg-[#C95F5F]/15 text-[#C95F5F]',
    // Backward compatibility aliases
    cyan: 'border-[#8CA4B8]/40 bg-[#8CA4B8]/15 text-[#8CA4B8]',
    emerald: 'border-[#9AAA78]/40 bg-[#9AAA78]/15 text-[#9AAA78]',
    amber: 'border-[#D0A05C]/40 bg-[#D0A05C]/15 text-[#D0A05C]',
    rose: 'border-[#C95F5F]/40 bg-[#C95F5F]/15 text-[#C95F5F]',
    success: 'border-[#9AAA78]/40 bg-[#9AAA78]/15 text-[#9AAA78]',
    destructive: 'border-[#C95F5F]/40 bg-[#C95F5F]/15 text-[#C95F5F]',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none uppercase tracking-wide',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
