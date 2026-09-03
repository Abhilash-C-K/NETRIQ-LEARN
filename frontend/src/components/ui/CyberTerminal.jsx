import React, { useState, useEffect } from "react";
import { Terminal, Copy, Check, Shield, Flame } from "lucide-react";
import { cn } from "../../lib/utils";

export function CyberTerminal({
  lines = [
    "[NETRIQ Core] Initializing Scapy packet capture engine on default interface...",
    "[FeatureExtractor] Listening on promiscuous mode for raw TCP/UDP/ICMP flows...",
    "[AnomalyDetector] Isolation Forest model loaded (n_estimators=100, max_samples=256).",
    "[ExplainabilityEngine] SHAP TreeExplainer cache warm and ready.",
    "[LIVE_MONITOR] System active. Dual-layer NIDS monitoring network traffic."
  ],
  title = "netriq-kernel-monitor v1.0.0",
  className,
}) {
  const [copied, setCopied] = useState(false);
  const [displayedLines, setDisplayedLines] = useState([]);

  useEffect(() => {
    setDisplayedLines([]);
    lines.forEach((line, index) => {
      setTimeout(() => {
        setDisplayedLines((prev) => [...prev, line]);
      }, index * 400);
    });
  }, [lines]);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayedLines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("rounded-xl border border-slate-800 bg-slate-950 font-mono shadow-2xl overflow-hidden", className)}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs text-slate-300 font-semibold">{title}</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 px-2.5 py-1 rounded transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      {/* Terminal Output Content */}
      <div className="p-4 space-y-2 text-xs font-mono text-slate-300 max-h-72 overflow-y-auto leading-relaxed">
        {displayedLines.map((line, idx) => (
          <div key={idx} className="flex items-start gap-2 animate-in fade-in slide-in-from-left-1 duration-200">
            <span className="text-cyan-400 font-bold select-none">&gt;</span>
            <span
              className={
                line.includes("[CRITICAL]") || line.includes("RECOMMEND_BLOCK") || line.includes("QUARANTINE")
                  ? "text-rose-400 font-semibold"
                  : line.includes("[WARNING]") || line.includes("Heuristic")
                  ? "text-amber-300"
                  : line.includes("CONNECTED") || line.includes("active") || line.includes("BENIGN")
                  ? "text-emerald-300"
                  : "text-slate-300"
              }
            >
              {line}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
          <span className="font-bold">&gt;</span>
          <span className="w-2 h-4 bg-cyan-400 inline-block" />
        </div>
      </div>
    </div>
  );
}
