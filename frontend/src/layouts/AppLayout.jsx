import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

export const AppLayout = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#f0f5fc] text-[#0f172a] overflow-hidden antialiased">
      {/* 1. Left Primary Dark Navy Sidebar */}
      <Sidebar />

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f0f5fc]">
        {/* Top Header Bar */}
        <Navbar />

        {/* Main Content View matching screenshot layout */}
        <main className="flex-1 overflow-y-auto px-8 pb-8 bg-[#f0f5fc]">
          <PageErrorBoundary key={location.pathname}>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
