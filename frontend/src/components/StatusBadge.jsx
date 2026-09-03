import React from 'react';
import { AlertCircle, Search, CheckCircle2, ShieldAlert } from 'lucide-react';

export const StatusBadge = ({ status = 'active', className = '' }) => {
  const normStatus = (status || 'active').toLowerCase();

  if (normStatus === 'investigating') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30 ${className}`}
      >
        <Search className="w-3 h-3 animate-spin text-amber-400" style={{ animationDuration: '3s' }} />
        INVESTIGATING
      </span>
    );
  }

  if (normStatus === 'resolved') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${className}`}
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        RESOLVED
      </span>
    );
  }

  // Default: 'active' or 'open'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono tracking-wide bg-rose-500/15 text-rose-400 border border-rose-500/30 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping inline-block" />
      ACTIVE
    </span>
  );
};
