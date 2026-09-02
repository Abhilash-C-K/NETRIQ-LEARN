import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Flame } from 'lucide-react';

export const SeverityBadge = ({ severity = 'LOW', size = 'medium', showIcon = true }) => {
  const normSeverity = String(severity).toUpperCase();

  const styles = {
    LOW: {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-glow-low',
      icon: ShieldCheck,
      dot: 'bg-emerald-500',
    },
    MEDIUM: {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: AlertTriangle,
      dot: 'bg-amber-500',
    },
    HIGH: {
      bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      icon: ShieldAlert,
      dot: 'bg-orange-500',
    },
    CRITICAL: {
      bg: 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-glow-rose',
      icon: Flame,
      dot: 'bg-rose-500 animate-pulse',
    },
  };

  const currentStyle = styles[normSeverity] || styles.LOW;
  const Icon = currentStyle.icon;

  const sizeClasses = {
    small: 'text-[10px] px-2 py-0.5 font-mono gap-1',
    medium: 'text-xs px-2.5 py-1 font-mono gap-1.5',
    large: 'text-sm px-3.5 py-1.5 font-mono gap-2 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold tracking-wider uppercase ${currentStyle.bg} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${currentStyle.dot}`} />
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{normSeverity}</span>
    </span>
  );
};
