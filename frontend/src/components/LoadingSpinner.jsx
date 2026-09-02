import React from 'react';

export const LoadingSpinner = ({ size = 'medium', label = 'Loading NETRIQ Telemetry...' }) => {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-3">
      <div
        className={`${sizeClasses[size]} border-slate-700 border-t-cyan-500 rounded-full animate-spin`}
      />
      {label && <span className="text-xs text-slate-400 font-mono animate-pulse">{label}</span>}
    </div>
  );
};
