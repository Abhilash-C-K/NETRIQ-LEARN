import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col justify-center items-center p-4 relative select-none overflow-hidden">
      {/* Ambient Blurry Logo Background Accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        {/* Ambient cyan depth aura */}
        <div className="absolute w-[700px] h-[700px] rounded-full bg-cyan-500/20 blur-[90px]" />
        {/* Optically centered N and Eye emblem - smoothly blended behind and around the card */}
        <div className="relative w-[650px] h-[650px] sm:w-[860px] sm:h-[860px] [mask-image:radial-gradient(circle_at_center,black_45%,transparent_80%)] filter blur-[18px] sm:blur-[22px] opacity-60 mix-blend-screen pointer-events-none">
          <img
            src="/logo.jpeg"
            alt="NetrIQ Ambient Emblem"
            className="w-full h-full object-cover"
          />
        </div>
        {/* Subtle radial vignette darkening around outer edges */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#030712]/30 to-[#030712]" />
      </div>

      {/* Login Card: Modern Glassmorphic Dark Cyber Panel */}
      <div className="w-full max-w-md bg-[#071324]/75 border border-[#1b365d] rounded-2xl p-8 shadow-[0_0_60px_-10px_rgba(0,180,255,0.22)] backdrop-blur-md relative z-10">
        {/* Header with NetrIQ Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#091b36] border border-[#1f4273] mx-auto mb-4 p-1.5 flex items-center justify-center overflow-hidden shadow-[0_0_25px_-5px_rgba(0,200,255,0.3)]">
            <img
              src="/logo.jpeg"
              alt="NetrIQ Logo"
              className="w-full h-full object-cover rounded-xl block"
            />
          </div>
          <div className="flex items-center justify-center font-corpta text-2xl tracking-[0.16em] uppercase select-none pl-1">
            <span className="text-white drop-shadow-sm">NETR</span>
            <span className="text-[#00e5ff] drop-shadow-[0_0_12px_rgba(0,229,255,0.5)]">IQ</span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 font-sans font-medium">
            Security Operations Console
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" aria-live="assertive" className="mb-6 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 shadow-sm">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-400" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="login-username" className="block text-xs font-sans font-medium text-slate-300 mb-1.5">
              USERNAME / EMAIL
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" aria-hidden="true" />
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                aria-required="true"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="analyst / admin"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#040b17]/90 border border-[#1d3a63] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]/50 transition-all font-sans"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-sans font-medium text-slate-300 mb-1.5">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" aria-hidden="true" />
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-required="true"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#040b17]/90 border border-[#1d3a63] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]/50 transition-all font-sans"
              />
            </div>
          </div>

          {/* Login Button: Radiant Cyan / Cobalt Gradient */}
          <button
            type="submit"
            disabled={loading}
            aria-label={loading ? "Authenticating security credentials" : "Sign In to NetrIQ Security Operations Console"}
            className="w-full mt-2 py-2.5 bg-gradient-to-r from-[#0066ff] via-[#00a8ff] to-[#00f0ff] hover:from-[#0052cc] hover:via-[#0094e0] hover:to-[#00d8e8] text-slate-950 font-sans font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(0,168,255,0.35)]"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        {/* Quick Fill Preset Buttons for Demo */}
        <div className="mt-8 pt-6 border-t border-[#162e52] text-center">
          <p className="text-[11px] font-sans font-medium text-slate-400 mb-2.5 tracking-wider">
            QUICK FILL DEMO ACCOUNTS
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              aria-label="Quick fill Admin account credentials"
              className="py-1.5 px-2 bg-[#061224] hover:bg-[#0c1f3d] border border-[#19355e] hover:border-[#00e5ff]/60 text-slate-300 hover:text-white rounded-lg text-xs font-sans transition-all text-center cursor-pointer shadow-2xs"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('analyst')}
              aria-label="Quick fill Analyst account credentials"
              className="py-1.5 px-2 bg-[#061224] hover:bg-[#0c1f3d] border border-[#19355e] hover:border-[#00e5ff]/60 text-slate-300 hover:text-white rounded-lg text-xs font-sans transition-all text-center cursor-pointer shadow-2xs"
            >
              Analyst
            </button>
          </div>
        </div>
      </div>

      {/* Footer System Info & Terms Link */}
      <footer className="mt-6 text-center text-xs text-slate-400 font-sans flex flex-col sm:flex-row items-center gap-2 relative z-10">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00e5ff]" aria-hidden="true" />
          <span>Strict Security Control • Authorized Personnel Only</span>
        </div>
        <span className="hidden sm:inline text-slate-600">•</span>
        <Link
          to="/terms"
          className="text-slate-400 hover:text-[#00e5ff] underline underline-offset-2 transition-colors cursor-pointer"
        >
          Terms of Service &amp; SOC Compliance
        </Link>
      </footer>
    </div>
  );
};

export default Login;
