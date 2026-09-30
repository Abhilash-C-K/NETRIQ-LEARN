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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#141516] text-[#F1F0EA] select-none cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#9AAA78] ${
        isExiting
          ? '-translate-x-full opacity-0 transition-all duration-350 ease-in-out'
          : 'translate-x-0 opacity-100 transition-all duration-300'
      }`}
    >
      {/* Central Brand Unit with Entrance Animation */}
      <div
        className={`flex flex-col items-center text-center p-8 max-w-sm mx-auto ${
          prefersReducedMotion
            ? 'opacity-100'
            : 'animate-in fade-in zoom-in-95 duration-500'
        }`}
      >
        {/* NetrIQ Brand Logo Container */}
        <div className="w-20 h-20 rounded-2xl bg-[#1E2021] border border-[#303334] p-1.5 mb-6 shadow-none flex items-center justify-center overflow-hidden">
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
            <Shield className="w-10 h-10 text-[#9AAA78] stroke-[1.75]" aria-hidden="true" />
          )}
        </div>

        {/* Distinctive Brand Wordmark: Corpta Haute Tech Typography */}
        <div className="flex flex-col items-center mb-3">
          <div className="flex items-center font-corpta text-3xl sm:text-4xl tracking-[0.16em] uppercase select-none pl-1">
            <span className="text-[#F1F0EA]">NETR</span>
            <span className="text-[#9AAA78]">IQ</span>
          </div>
          <span className="text-[10px] font-mono tracking-[0.38em] text-[#70736F] uppercase mt-2">
            Autonomous NIDS
          </span>
        </div>
        <p className="text-xs sm:text-sm font-sans text-[#A4A5A0] tracking-normal mb-8">
          Intelligent Network Defense &amp; Firewall Response
        </p>

        {/* Interaction Hint */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#303334] bg-[#1E2021] text-xs font-mono text-[#9AAA78] hover:border-[#9AAA78] transition-colors">
          <span>Tap anywhere to continue</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
      </div>

      {/* Subtle Bottom Keycap Guide */}
      <div className="absolute bottom-8 text-[11px] font-mono text-[#70736F]">
        Press <kbd className="px-1.5 py-0.5 rounded bg-[#1E2021] border border-[#303334] text-[#A4A5A0]">Enter</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-[#1E2021] border border-[#303334] text-[#A4A5A0]">Space</kbd>
      </div>
    </div>
  );
};

export default Splash;
