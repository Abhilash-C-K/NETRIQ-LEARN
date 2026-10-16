import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setAccessToken } from '../services/api';
import { Lock, User, ShieldAlert, ArrowRight, ShieldCheck, Shield } from 'lucide-react';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any stale/expired tokens so fresh login attempts aren't contaminated
    setAccessToken(null);
    localStorage.removeItem('netriq_access_token');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username/email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      const detail = err.response?.data?.detail;
      const message = err.response?.data?.message;
      let errorMsg = 'Authentication failed. Please verify credentials.';
      if (typeof detail === 'string' && detail.trim()) {
        errorMsg = detail;
      } else if (typeof message === 'string' && message.trim()) {
        errorMsg = message;
      } else if (Array.isArray(detail) && detail.length > 0) {
        errorMsg = detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        errorMsg = 'Cannot reach backend server. Please ensure the backend is running on port 8000.';
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (userType) => {
    if (userType === 'admin') {
      setUsername('admin@netriq.local');
      setPassword('AdminPassword123!');
    } else if (userType === 'analyst') {
      setUsername('analyst@netriq.local');
      setPassword('AnalystPassword123!');
    } else if (userType === 'viewer') {
      setUsername('viewer@netriq.local');
      setPassword('ViewerPassword123!');
    }
  };

  return (
    <div className="min-h-screen bg-[#3b2a27] flex flex-col justify-center items-center p-4 relative select-none">
      {/* Login Card: #4a3330, 1px solid #6b4c45, no glow */}
      <div className="w-full max-w-md bg-[#4a3330] border border-[#6b4c45] rounded-lg p-8 shadow-none relative z-10">
        {/* Header with NetrIQ Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-[#5c3d38] border border-[#6b4c45] mx-auto mb-4 p-1 flex items-center justify-center overflow-hidden">
            <img
              src="/logo.jpeg"
              alt="NetrIQ Logo"
              className="w-full h-full object-cover rounded-lg block"
            />
          </div>
          <div className="flex items-center justify-center font-corpta text-2xl tracking-[0.16em] uppercase select-none pl-1">
            <span className="text-[#f8f4e7]">NETR</span>
            <span className="text-[#cc5500]">IQ</span>
          </div>
          <p className="text-xs text-[#d4bfb0] mt-1 font-sans">
            Security Operations Console
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-[#b83a2e]/15 border border-[#b83a2e]/40 text-[#b83a2e] text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-sans font-medium text-[#d4bfb0] mb-1.5">
              USERNAME / EMAIL
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-[#a08070]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="analyst / admin"
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#5c3d38] border border-[#6b4c45] rounded-lg text-sm text-[#f8f4e7] placeholder-[#a08070] focus:outline-none focus:border-[#cc5500] transition-colors font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-sans font-medium text-[#d4bfb0] mb-1.5">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-[#a08070]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#5c3d38] border border-[#6b4c45] rounded-lg text-sm text-[#f8f4e7] placeholder-[#a08070] focus:outline-none focus:border-[#cc5500] transition-colors font-sans"
              />
            </div>
          </div>

          {/* Login Button: #cc5500 (Olive) with #3b2a27 text */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-[#cc5500] hover:bg-[#e06010] text-[#3b2a27] font-sans font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Quick Fill Preset Buttons for Demo */}
        <div className="mt-8 pt-6 border-t border-[#6b4c45] text-center">
          <p className="text-[11px] font-sans font-medium text-[#d4bfb0] mb-2.5 tracking-wider">
            QUICK FILL DEMO ACCOUNTS
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickFill('admin')}
              className="py-1.5 px-2 bg-[#3b2a27] hover:bg-[#5c3d38] border border-[#6b4c45] hover:border-[#c4956a] text-[#f8f4e7] rounded-lg text-xs font-sans transition-colors text-center cursor-pointer"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickFill('analyst')}
              className="py-1.5 px-2 bg-[#3b2a27] hover:bg-[#5c3d38] border border-[#6b4c45] hover:border-[#cc5500] text-[#f8f4e7] rounded-lg text-xs font-sans transition-colors text-center cursor-pointer"
            >
              Analyst
            </button>
            <button
              onClick={() => handleQuickFill('viewer')}
              className="py-1.5 px-2 bg-[#3b2a27] hover:bg-[#5c3d38] border border-[#6b4c45] hover:border-[#d4bfb0] text-[#f8f4e7] rounded-lg text-xs font-sans transition-colors text-center cursor-pointer"
            >
              Viewer
            </button>
          </div>
        </div>
      </div>

      {/* Footer System Info */}
      <div className="mt-6 text-center text-xs text-[#a08070] font-sans flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#cc5500]" />
        <span>Strict Security Control • Authorized Personnel Only</span>
      </div>
    </div>
  );
};

export default Login;
