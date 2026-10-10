import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Flame } from 'lucide-react';

export const SeverityBadge = ({ severity = 'LOW', size = 'medium', showIcon = true }) => {
  const normSeverity = String(severity).toUpperCase();

  // Security states: Healthy (#cc5500), Low (#c4956a), Medium (#cc8833), High (#cc5500), Critical (#b83a2e)
  const styles = {
    HEALTHY: {
      bg: 'bg-[#cc5500]/15 text-[#cc5500] border-[#cc5500]/30',
      icon: ShieldCheck,
      dot: 'bg-[#cc5500]',
    },
    LOW: {
      bg: 'bg-[#c4956a]/15 text-[#c4956a] border-[#c4956a]/30',
      icon: ShieldCheck,
      dot: 'bg-[#c4956a]',
    },
    MEDIUM: {
      bg: 'bg-[#cc8833]/15 text-[#cc8833] border-[#cc8833]/30',
      icon: AlertTriangle,
      dot: 'bg-[#cc8833]',
    },
    HIGH: {
      bg: 'bg-[#cc5500]/15 text-[#cc5500] border-[#cc5500]/30',
      icon: ShieldAlert,
      dot: 'bg-[#cc5500]',
    },
    CRITICAL: {
      bg: 'bg-[#b83a2e]/15 text-[#b83a2e] border-[#b83a2e]/30',
      icon: Flame,
      dot: 'bg-[#b83a2e]',
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
