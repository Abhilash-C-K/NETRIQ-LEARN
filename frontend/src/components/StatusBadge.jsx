import React from 'react';
import { Search, CheckCircle2 } from 'lucide-react';

export const StatusBadge = ({ status = 'active', className = '' }) => {
  const normStatus = (status || 'active').toLowerCase();

  if (normStatus === 'investigating') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide bg-[#D0A05C]/15 text-[#D0A05C] border border-[#D0A05C]/30 ${className}`}
      >
        <Search className="w-3 h-3 text-[#D0A05C]" />
        INVESTIGATING
      </span>
    );
  }

  if (normStatus === 'resolved') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide bg-[#9AAA78]/15 text-[#9AAA78] border border-[#9AAA78]/30 ${className}`}
      >
        <CheckCircle2 className="w-3 h-3 text-[#9AAA78]" />
        RESOLVED
      </span>
    );
  }

  // Default: 'active' or 'open' - formatted as critical state #C95F5F per design spec
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide bg-[#C95F5F]/15 text-[#C95F5F] border border-[#C95F5F]/30 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#C95F5F] inline-block" />
      ACTIVE
    </span>
  );
};
export default StatusBadge;
