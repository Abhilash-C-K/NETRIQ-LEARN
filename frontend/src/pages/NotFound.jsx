import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
      <h1 className="text-4xl font-bold font-mono text-slate-100 mb-2">404</h1>
      <h2 className="text-lg font-semibold text-slate-300 font-mono mb-4 uppercase tracking-wider">
        Module Not Found
      </h2>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        The requested security path does not exist or has been relocated by system controls.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Dashboard
      </Link>
    </div>
  );
};
