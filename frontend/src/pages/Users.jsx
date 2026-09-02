import React from 'react';
import { Users as UsersIcon } from 'lucide-react';

export const Users = () => (
  <div className="space-y-4">
    <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-4">
      <UsersIcon className="w-5 h-5 text-rose-400" /> User Management
    </h1>
    <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm font-mono">
      Manage SOC analysts, role permissions, and access credentials (Admin only).
    </div>
  </div>
);
