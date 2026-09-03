import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { FlickeringGrid } from '../components/ui/FlickeringGrid';
import { BorderBeam } from '../components/ui/BorderBeam';
import { RippleButton } from '../components/ui/RippleButton';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login failed:', err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Authentication failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Magic UI Flickering Grid Background */}
      <FlickeringGrid
        squareSize={4}
        gridGap={6}
        flickerChance={0.25}
        color="rgb(6, 182, 212)"
        maxOpacity={0.25}
      />

      {/* Background SOC Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10 overflow-hidden">
        {/* Border Beam Perimeter Glow */}
        <BorderBeam size={220} duration={10} colorFrom="#06b6d4" colorTo="#3b82f6" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-glow-cyan">
            <Flame className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-wider text-slate-100">
            NETRIQ <span className="text-cyan-400 font-sans font-light">SOC</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Autonomous Dual-Layer Network Intrusion Detection
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="analyst / admin"
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
            </div>
          </div>

          <RippleButton
            type="submit"
            disabled={isSubmitting}
            rippleColor="rgba(6, 182, 212, 0.4)"
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm rounded-lg shadow-glow-cyan transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : (
              <>
                <span>Sign In to Terminal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </RippleButton>
        </form>

        {/* Quick Demo Fill Credentials */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <div className="text-[11px] font-mono text-slate-400 mb-2 text-center uppercase tracking-wider">
            Quick Fill Demo Accounts
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setUsername('admin@netriq.local');
                setPassword('AdminPassword123!');
              }}
              className="py-1.5 px-2 bg-slate-950/80 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/30 text-cyan-400 rounded text-xs font-mono transition-all text-center"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('analyst@netriq.local');
                setPassword('AnalystPassword123!');
              }}
              className="py-1.5 px-2 bg-slate-950/80 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/30 text-cyan-400 rounded text-xs font-mono transition-all text-center"
            >
              Analyst
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('viewer@netriq.local');
                setPassword('ViewerPassword123!');
              }}
              className="py-1.5 px-2 bg-slate-950/80 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/30 text-cyan-400 rounded text-xs font-mono transition-all text-center"
            >
              Viewer
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[11px] text-slate-400 font-mono">
          Strict Security Control • Authorized Personnel Only
        </div>
      </div>
    </div>
  );
};
