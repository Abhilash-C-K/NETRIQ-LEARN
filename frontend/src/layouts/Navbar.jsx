import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, User, ChevronDown, LogOut } from 'lucide-react';

export const Navbar = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-20 bg-[#f0f5fc] px-8 flex items-center justify-between select-none shrink-0">
      {/* Left: Welcome Greeting */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#0a1c3d] tracking-tight">
          Welcome, {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : 'Admin'}
        </h1>
        <p className="text-xs text-[#687d9a] mt-0.5 font-medium">
          Real-time network monitoring and intelligent threat response
        </p>
      </div>

      {/* Right: Search, Notification Bell, User Avatar */}
      <div className="flex items-center gap-4">
        {/* Search Bar Pill */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#8fa0b5]" />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 pl-9 pr-4 py-2 rounded-full border border-[#d5e2f0] bg-white text-xs text-[#0a1c3d] placeholder-[#8fa0b5] shadow-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Bell Icon with red notification dot */}
        <button
          onClick={() => navigate('/threats')}
          title="Notifications"
          className="relative w-9 h-9 rounded-full bg-white border border-[#d5e2f0] flex items-center justify-center text-[#506680] hover:text-[#0a1c3d] shadow-xs cursor-pointer transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ef4444] border-2 border-white" />
        </button>

        {/* User Pill / Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white border border-[#d5e2f0] shadow-xs hover:border-blue-300 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-[#0a1c3d] text-white flex items-center justify-center font-bold text-xs">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-[#0a1c3d]">
              {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : 'Admin'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#687d9a]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#e2e8f0] py-1.5 z-50">
              <div className="px-3.5 py-2 border-b border-[#f1f5f9]">
                <div className="text-xs font-bold text-[#0a1c3d]">{user?.username || 'Admin'}</div>
                <div className="text-[10px] text-[#64748b] truncate">{user?.email || 'admin@netriq.local'}</div>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-[#334155] hover:bg-[#f8fafc] cursor-pointer"
              >
                Settings
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
