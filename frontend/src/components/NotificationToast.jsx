import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export const NotificationToast = ({ type = 'info', title, message, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-rose-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-cyan-400" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-200',
    error: 'border-rose-500/30 bg-rose-950/40 text-rose-200',
    warning: 'border-amber-500/30 bg-amber-950/40 text-amber-200',
    info: 'border-cyan-500/30 bg-cyan-950/40 text-cyan-200',
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border backdrop-blur-md shadow-lg ${borders[type]} max-w-md w-full animate-in fade-in slide-in-from-top-2`}
    >
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        {title && <h4 className="text-sm font-semibold tracking-wide uppercase font-mono">{title}</h4>}
        <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
