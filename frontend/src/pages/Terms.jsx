import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Lock, FileText, Server, AlertTriangle, Eye } from 'lucide-react';

export const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-200 flex flex-col items-center justify-between p-4 sm:p-8 font-sans selection:bg-[#00e5ff]/20 selection:text-[#00e5ff] overflow-x-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#0055ff]/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-[#00e5ff]/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="w-full max-w-4xl relative z-10 flex items-center justify-between pb-6 border-b border-[#132847]">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1d3d6b] bg-[#091830]/80 text-xs font-mono text-slate-300 hover:text-white hover:border-[#00e5ff] transition-all cursor-pointer"
          aria-label="Back to Login"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </button>

        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#00e5ff]" />
          <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
            NETRIQ SOC COMPLIANCE
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl relative z-10 my-8 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] text-[11px] font-mono">
            <FileText className="w-3.5 h-3.5" />
            <span>OPERATIONAL TERMS &amp; ACCEPTABLE USE POLICY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Terms of Service &amp; Security Compliance Agreement
          </h1>
          <p className="text-sm text-slate-400">
            Last updated: October 2026 • Security Operations Center (SOC) Policy v2.4
          </p>
        </div>

        {/* Section 1: Authorized Access Only */}
        <div className="p-5 rounded-2xl bg-[#071324]/80 border border-[#183660] space-y-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
            <Lock className="w-4 h-4 text-[#00e5ff]" />
            <h2>1. Authorized Personnel &amp; System Access</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The NetrIQ Autonomous Network Intrusion Detection &amp; Response Console is restricted exclusively to authorized Security Operations Center (SOC) administrators, analysts, and incident responders. Unauthorized access or transmission of unauthorized commands is strictly prohibited and subject to legal prosecution.
          </p>
        </div>

        {/* Section 2: Active Automated Defense & Firewall Isolation */}
        <div className="p-5 rounded-2xl bg-[#071324]/80 border border-[#183660] space-y-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 text-[#38bdf8]" />
            <h2>2. Automated Threat Mitigation &amp; Firewall Actions</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            NetrIQ executes real-time machine learning predictions and automated threat mitigation actions, including ingress IP blacklisting and host network isolation. Actions taken by automated engines or operators are non-disruptive by design but may terminate sessions of anomalous hosts during active denial-of-service or intrusion incidents.
          </p>
        </div>

        {/* Section 3: Row-Level Security & Data Privacy */}
        <div className="p-5 rounded-2xl bg-[#071324]/80 border border-[#183660] space-y-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
            <Eye className="w-4 h-4 text-[#00e5ff]" />
            <h2>3. Telemetry, Row-Level Security (RLS) &amp; Privacy</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All network telemetry, ingress packet headers, and forensic logs are processed under strict Role-Based Access Control (RBAC) and Row-Level Security. Accounts with Viewer privileges receive masked IP addresses and sanitized payload data to prevent unauthorized reconnaissance.
          </p>
        </div>

        {/* Section 4: Audit Trails & Backup Retention */}
        <div className="p-5 rounded-2xl bg-[#071324]/80 border border-[#183660] space-y-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
            <Server className="w-4 h-4 text-[#38bdf8]" />
            <h2>4. Continuous Audit Trails &amp; Database Backups</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Incident records, analyst actions, and response engine executions are cryptographically logged in real time. Historical threat telemetry is backed up on dedicated MongoDB Atlas clusters to ensure high availability and disaster recovery compliance.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl relative z-10 pt-6 border-t border-[#132847] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
        <span>&copy; {new Date().getFullYear()} NetrIQ Cyber Defense Systems. All rights reserved.</span>
        <button
          onClick={() => navigate('/login')}
          className="text-[#00e5ff] hover:underline cursor-pointer"
        >
          Return to Sign In &rarr;
        </button>
      </footer>
    </div>
  );
};

export default Terms;
