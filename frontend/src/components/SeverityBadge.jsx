import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Flame } from 'lucide-react';

export const SeverityBadge = ({ severity = 'LOW', size = 'medium', showIcon = true }) => {
  const normSeverity = String(severity).toUpperCase();

  // Security states: Healthy (#9AAA78), Low (#8CA4B8), Medium (#D0A05C), High (#D27C62), Critical (#C95F5F)
  const styles = {
    HEALTHY: {
      bg: 'bg-[#9AAA78]/15 text-[#9AAA78] border-[#9AAA78]/30',
      icon: ShieldCheck,
      dot: 'bg-[#9AAA78]',
    },
    LOW: {
      bg: 'bg-[#8CA4B8]/15 text-[#8CA4B8] border-[#8CA4B8]/30',
      icon: ShieldCheck,
      dot: 'bg-[#8CA4B8]',
    },
    MEDIUM: {
      bg: 'bg-[#D0A05C]/15 text-[#D0A05C] border-[#D0A05C]/30',
      icon: AlertTriangle,
      dot: 'bg-[#D0A05C]',
    },
    HIGH: {
      bg: 'bg-[#D27C62]/15 text-[#D27C62] border-[#D27C62]/30',
      icon: ShieldAlert,
      dot: 'bg-[#D27C62]',
    },
    CRITICAL: {
      bg: 'bg-[#C95F5F]/15 text-[#C95F5F] border-[#C95F5F]/30',
      icon: Flame,
      dot: 'bg-[#C95F5F]',
    },
  };

  const currentStyle = styles[normSeverity] || styles.LOW;
  const Icon = currentStyle.icon;

  const sizeClasses = {
    small: 'text-[10px] px-2 py-0.5 gap-1',
    medium: 'text-xs px-2.5 py-0.5 gap-1.5',
    large: 'text-xs px-3 py-1 gap-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium tracking-wide uppercase ${currentStyle.bg} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${currentStyle.dot}`} />
      {showIcon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{normSeverity}</span>
    </span>
  );
};
export default SeverityBadge;
