import React from 'react';
import { Search, CheckCircle2 } from 'lucide-react';

export const StatusBadge = ({ status = 'active', className = '' }) => {
  const normStatus = (status || 'active').toLowerCase();

  if (normStatus === 'investigating') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide bg-[#cc8833]/15 text-[#cc8833] border border-[#cc8833]/30 ${className}`}
      >
        <Search className="w-3 h-3 text-[#cc8833]" />
        INVESTIGATING
      </span>
    );
  }

  if (normStatus === 'resolved') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide bg-[#cc5500]/15 text-[#cc5500] border border-[#cc5500]/30 ${className}`}
      >
        <CheckCircle2 className="w-3 h-3 text-[#cc5500]" />
        RESOLVED
      </span>
    );
  }

  // Default: 'active' or 'open' - formatted as critical state #b83a2e per design spec
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide bg-[#b83a2e]/15 text-[#b83a2e] border border-[#b83a2e]/30 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#b83a2e] inline-block" />
      ACTIVE
    </span>
  );
};
export default StatusBadge;
