import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

const SPLASH_SESSION_KEY = 'netriq_splash_dismissed';

export const Splash = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [isExiting, setIsExiting] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  // Check if splash was already dismissed during this session
  const isAlreadyDismissed = (() => {
    try {
      return sessionStorage.getItem(SPLASH_SESSION_KEY) === 'true';
    } catch (e) {
      return false;
    }
  })();

  // If already dismissed in this session, skip splash and proceed straight to login
  if (isAlreadyDismissed) {
    return <Navigate to="/login" replace />;
  }

  const handleDismiss = () => {
    if (isExiting) return;

    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, 'true');
    } catch (e) {
      // Storage access blocked or restricted; fail gracefully
    }

    if (prefersReducedMotion) {
      navigate('/login');
    } else {
      setIsExiting(true);
      setTimeout(() => {
        navigate('/login');
      }, 350);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      handleDismiss();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Welcome to NetrIQ Platform. Click or press Enter to proceed to Login."
      onClick={handleDismiss}
      onTouchStart={handleDismiss}
      onKeyDown={handleKeyDown}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030712] text-slate-100 select-none cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#00e5ff] ${
        isExiting
          ? '-translate-x-full opacity-0 transition-all duration-350 ease-in-out'
          : 'translate-x-0 opacity-100 transition-all duration-300'
      }`}
    >
      {/* Ambient Blurry Logo Background Accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        {/* Ambient cyan depth glow */}
        <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/20 blur-[90px]" />
        {/* Optically centered N and Eye emblem with silky blur and feathered radial blend */}
        <div className="relative w-[560px] h-[560px] sm:w-[760px] sm:h-[760px] [mask-image:radial-gradient(circle_at_center,black_45%,transparent_80%)] filter blur-[18px] sm:blur-[22px] opacity-60 mix-blend-screen pointer-events-none -translate-x-[8%] -translate-y-[6%]">
          <img
            src="/logo.jpeg"
            alt="NetrIQ Ambient Emblem"
            className="w-full h-full object-cover"
          />
        </div>
        {/* Subtle radial vignette darkening around outer edges */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#030712]/30 to-[#030712]" />
      </div>

      {/* Central Brand Unit with Entrance Animation */}
      <div
        className={`relative z-10 flex flex-col items-center text-center p-8 max-w-sm mx-auto ${
          prefersReducedMotion
            ? 'opacity-100'
            : 'animate-in fade-in zoom-in-95 duration-500'
        }`}
      >
        {/* NetrIQ Brand Logo Container with Glowing Accent */}
        <div className="w-24 h-24 rounded-2xl bg-[#071326]/90 border border-[#1b365d] p-1.5 mb-6 shadow-[0_0_35px_-5px_rgba(0,180,255,0.3)] flex items-center justify-center overflow-hidden backdrop-blur-md">
          <img
            src="/logo.jpeg"
            alt="NetrIQ Logo"
            className="w-full h-full object-cover rounded-xl block"
            onLoad={() => setLogoLoaded(true)}
            onError={(e) => {
              // Graceful fallback if image path ever fails
              e.currentTarget.style.display = 'none';
            }}
          />
          {!logoLoaded && (
            <Shield className="w-10 h-10 text-[#00e5ff] stroke-[1.75]" aria-hidden="true" />
          )}
        </div>

        {/* Distinctive Brand Wordmark: Corpta Haute Tech Typography */}
        <div className="flex flex-col items-center mb-3">
          <div className="flex items-center font-corpta text-3xl sm:text-4xl tracking-[0.16em] uppercase select-none pl-1">
            <span className="text-white drop-shadow-sm">NETR</span>
            <span className="text-[#00e5ff] drop-shadow-[0_0_12px_rgba(0,229,255,0.5)]">IQ</span>
          </div>
          <span className="text-[10px] font-mono tracking-[0.38em] text-[#38bdf8] uppercase mt-2 font-semibold">
            Autonomous NIDS
          </span>
        </div>
        <p className="text-xs sm:text-sm font-sans text-slate-300 tracking-normal mb-8 max-w-[280px]">
          Intelligent Network Defense &amp; Firewall Response
        </p>

        {/* Interaction Hint */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1d3d6b] bg-[#091830]/80 backdrop-blur-md text-xs font-mono text-[#00e5ff] hover:border-[#00e5ff] hover:bg-[#0d2242] transition-all shadow-[0_0_15px_-3px_rgba(0,200,255,0.25)]">
          <span>Tap anywhere to continue</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
      </div>

      {/* Subtle Bottom Keycap Guide */}
      <div className="absolute bottom-8 text-[11px] font-mono text-slate-400 z-10 flex items-center gap-1.5">
        <span>Press</span>
        <kbd className="px-2 py-0.5 rounded bg-[#0b1b33] border border-[#1d3d6b] text-slate-200 shadow-2xs">Enter</kbd>
        <span>or</span>
        <kbd className="px-2 py-0.5 rounded bg-[#0b1b33] border border-[#1d3d6b] text-slate-200 shadow-2xs">Space</kbd>
      </div>
    </div>
  );
};

export default Splash;
