import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const AppLayout = () => {
  return (
    <div className="flex h-screen bg-[#141516] text-[#F1F0EA] overflow-hidden">
      {/* 1. Left Primary Sidebar Navigation */}
      <Sidebar />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <Navbar />

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#141516]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
