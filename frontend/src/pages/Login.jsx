import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { BorderBeam } from '../components/ui/BorderBeam';
import { FlickeringGrid } from '../components/ui/FlickeringGrid';

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
      setPassword('AnalystPass123!');
    } else if (userType === 'viewer') {
      setUsername('viewer@netriq.local');
      setPassword('ViewerPass123!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Magic UI Flickering Grid */}
      <FlickeringGrid
        className="absolute inset-0 z-0"
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

        {/* Header with Official NETRIQ Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-cyan-500/50 mx-auto mb-4 shadow-[0_0_20px_rgba(6,182,212,0.5)] p-0.5 bg-slate-950 flex items-center justify-center">
            <img src="/logo.jpeg" alt="NETRIQ Logo" className="w-full h-full object-cover rounded-xl block" />
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
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              USERNAME / EMAIL
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="analyst / admin"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs rounded-lg shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Terminal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Quick Fill Preset Buttons for Demo */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-[10px] font-mono text-slate-500 mb-3 tracking-wider">
            QUICK FILL DEMO ACCOUNTS
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickFill('admin')}
              className="py-1.5 px-2 bg-slate-950/80 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/30 text-cyan-400 rounded text-xs font-mono transition-all text-center"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickFill('analyst')}
              className="py-1.5 px-2 bg-slate-950/80 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/30 text-cyan-400 rounded text-xs font-mono transition-all text-center"
            >
              Analyst
            </button>
            <button
              onClick={() => handleQuickFill('viewer')}
              className="py-1.5 px-2 bg-slate-950/80 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/30 text-cyan-400 rounded text-xs font-mono transition-all text-center"
            >
              Viewer
            </button>
          </div>
        </div>
      </div>

      {/* Footer System Info */}
      <div className="mt-8 text-center text-xs text-slate-600 font-mono flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-cyan-500/70" />
        <span>Strict Security Control • Authorized Personnel Only</span>
      </div>
    </div>
  );
};
export default Login;
