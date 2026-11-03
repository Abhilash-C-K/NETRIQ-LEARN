import React, { useState, useEffect } from "react";
import { Terminal, Copy, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export function CyberTerminal({
  lines = [
    "[NETRIQ Engine] Scapy packet capture engine initialized on active interface...",
    "[FeatureExtractor] Listening in promiscuous mode for raw TCP/UDP/ICMP flows...",
    "[AnomalyDetector] Isolation Forest model loaded (n_estimators=100, max_samples=256).",
    "[ExplainabilityEngine] Feature attribution engine ready.",
    "[LIVE_MONITOR] Dual-layer NIDS monitoring network wire traffic."
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
    <div className={cn("rounded-xl border border-[#e2eaf4] bg-white shadow-xs overflow-hidden", className)}>
      {/* Top Bar matching light app header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#f8fafc] border-b border-[#e2eaf4]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-600" />
          <span className="text-xs text-[#0a1c3d] font-sans font-bold">{title}</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-xs font-sans font-medium"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      {/* Terminal Output Content */}
      <div className="p-4 space-y-1.5 text-xs font-mono bg-[#090d16] text-slate-200 max-h-72 overflow-y-auto leading-relaxed">
        {displayedLines.map((line, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="text-blue-400 font-bold select-none">&gt;</span>
            <span
              className={
                line.includes("[CRITICAL]") || line.includes("RECOMMEND_BLOCK") || line.includes("QUARANTINE") || line.includes("MALICIOUS")
                  ? "text-rose-400 font-semibold"
                  : line.includes("[WARNING]") || line.includes("Heuristic")
                  ? "text-amber-400"
                  : line.includes("CONNECTED") || line.includes("active") || line.includes("BENIGN")
                  ? "text-emerald-400"
                  : "text-slate-300"
              }
            >
              {line}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-blue-400">
          <span className="font-bold">&gt;</span>
          <span className="w-2 h-3.5 bg-blue-400 inline-block animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default CyberTerminal;
