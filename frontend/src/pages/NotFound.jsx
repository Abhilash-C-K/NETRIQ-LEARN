import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#101820] flex flex-col items-center justify-center p-4 text-center">
      <div className="p-3 rounded-full bg-[#DF857C]/15 border border-[#DF857C]/30 text-[#DF857C] mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold font-mono text-[#E7ECEF] mb-1">404</h1>
      <h2 className="text-sm font-semibold text-[#9AA8B2] font-sans mb-3 uppercase tracking-wider">
        Resource Not Found
      </h2>
      <p className="text-xs text-[#687883] max-w-sm mb-6 font-sans">
        The requested path does not exist or has been relocated by access policies.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#19242E] hover:bg-[#202D36] border border-[#2A3944] text-[#E7ECEF] rounded-lg text-xs font-sans transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-[#7895B2]" />
        Return to Smart Summary
      </Link>
    </div>
  );
};
