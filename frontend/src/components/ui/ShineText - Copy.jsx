import React from 'react';
import { cn } from '../../lib/utils';

export function ShineText({
  text = '',
  className = '',
  shineColor = 'rgba(6, 182, 212, 0.8)',
}) {
  return (
    <span
      className={cn(
        'inline-block bg-gradient-to-r from-slate-100 via-cyan-400 to-slate-100 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer',
        className
      )}
      style={{
        animation: 'shimmer 4s linear infinite',
      }}
    >
      {text}
    </span>
  );
}
