import * as React from 'react';
import { cn } from '../../lib/utils';

function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'border-[#6b4c45] bg-[#5c3d38] text-[#d4bfb0]',
    outline: 'border-[#6b4c45] bg-transparent text-[#d4bfb0]',
    healthy: 'border-[#cc5500]/40 bg-[#cc5500]/15 text-[#cc5500]',
    info: 'border-[#c4956a]/40 bg-[#c4956a]/15 text-[#c4956a]',
    warning: 'border-[#cc8833]/40 bg-[#cc8833]/15 text-[#cc8833]',
    critical: 'border-[#b83a2e]/40 bg-[#b83a2e]/15 text-[#b83a2e]',
    // Backward compatibility aliases
    cyan: 'border-[#c4956a]/40 bg-[#c4956a]/15 text-[#c4956a]',
    emerald: 'border-[#cc5500]/40 bg-[#cc5500]/15 text-[#cc5500]',
    amber: 'border-[#cc8833]/40 bg-[#cc8833]/15 text-[#cc8833]',
    rose: 'border-[#b83a2e]/40 bg-[#b83a2e]/15 text-[#b83a2e]',
    success: 'border-[#cc5500]/40 bg-[#cc5500]/15 text-[#cc5500]',
    destructive: 'border-[#b83a2e]/40 bg-[#b83a2e]/15 text-[#b83a2e]',
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
