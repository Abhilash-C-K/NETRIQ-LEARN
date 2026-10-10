import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const AppLayout = () => {
  return (
    <div className="flex h-screen bg-[#f4f7fb] text-[#0f172a] overflow-hidden antialiased">
      {/* 1. Left Primary Dark Navy Sidebar */}
      <Sidebar />

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <Navbar />

        {/* Main Content View with crisp light theme */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#f4f7fb]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
