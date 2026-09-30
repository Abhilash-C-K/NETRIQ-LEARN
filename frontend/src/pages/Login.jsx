import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ShieldAlert, ArrowRight, ShieldCheck, Shield } from 'lucide-react';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

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
      setError(
        err.response?.data?.detail ||
          'Authentication failed. Please verify credentials.'
      );
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
    <div className="min-h-screen bg-[#141516] flex flex-col justify-center items-center p-4 relative select-none">
      {/* Login Card: #1E2021, 1px solid #303334, no glow */}
      <div className="w-full max-w-md bg-[#1E2021] border border-[#303334] rounded-lg p-8 shadow-none relative z-10">
        {/* Header with NetrIQ Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-[#252728] border border-[#303334] mx-auto mb-4 p-1 flex items-center justify-center overflow-hidden">
            <img
              src="/logo.jpeg"
              alt="NetrIQ Logo"
              className="w-full h-full object-cover rounded-lg block"
            />
          </div>
          <div className="flex items-center justify-center font-corpta text-2xl tracking-[0.16em] uppercase select-none pl-1">
            <span className="text-[#F1F0EA]">NETR</span>
            <span className="text-[#9AAA78]">IQ</span>
          </div>
          <p className="text-xs text-[#A4A5A0] mt-1 font-sans">
            Security Operations Console
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-[#C95F5F]/15 border border-[#C95F5F]/40 text-[#C95F5F] text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-sans font-medium text-[#A4A5A0] mb-1.5">
              USERNAME / EMAIL
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-[#70736F]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="analyst / admin"
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#252728] border border-[#303334] rounded-lg text-sm text-[#F1F0EA] placeholder-[#70736F] focus:outline-none focus:border-[#9AAA78] transition-colors font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-sans font-medium text-[#A4A5A0] mb-1.5">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-[#70736F]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#252728] border border-[#303334] rounded-lg text-sm text-[#F1F0EA] placeholder-[#70736F] focus:outline-none focus:border-[#9AAA78] transition-colors font-sans"
              />
            </div>
          </div>

          {/* Login Button: #9AAA78 (Olive) with #141516 text */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-[#9AAA78] hover:bg-[#A9B989] text-[#141516] font-sans font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
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
        <div className="mt-8 pt-6 border-t border-[#303334] text-center">
          <p className="text-[11px] font-sans font-medium text-[#A4A5A0] mb-2.5 tracking-wider">
            QUICK FILL DEMO ACCOUNTS
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickFill('admin')}
              className="py-1.5 px-2 bg-[#141516] hover:bg-[#252728] border border-[#303334] hover:border-[#8CA4B8] text-[#F1F0EA] rounded-lg text-xs font-sans transition-colors text-center cursor-pointer"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickFill('analyst')}
              className="py-1.5 px-2 bg-[#141516] hover:bg-[#252728] border border-[#303334] hover:border-[#9AAA78] text-[#F1F0EA] rounded-lg text-xs font-sans transition-colors text-center cursor-pointer"
            >
              Analyst
            </button>
            <button
              onClick={() => handleQuickFill('viewer')}
              className="py-1.5 px-2 bg-[#141516] hover:bg-[#252728] border border-[#303334] hover:border-[#A4A5A0] text-[#F1F0EA] rounded-lg text-xs font-sans transition-colors text-center cursor-pointer"
            >
              Viewer
            </button>
          </div>
        </div>
      </div>

      {/* Footer System Info */}
      <div className="mt-6 text-center text-xs text-[#70736F] font-sans flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#9AAA78]" />
        <span>Strict Security Control • Authorized Personnel Only</span>
      </div>
    </div>
  );
};

export default Login;
