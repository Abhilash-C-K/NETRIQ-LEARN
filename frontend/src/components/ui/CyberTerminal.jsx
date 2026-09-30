import React, { useState, useEffect } from "react";
import { Terminal, Copy, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export function CyberTerminal({
  lines = [
    "[NETRIQ Engine] Scapy packet capture engine initialized on active interface...",
    "[FeatureExtractor] Listening in promiscuous mode for raw TCP/UDP/ICMP flows...",
    "[AnomalyDetector] Isolation Forest model loaded (n_estimators=100, max_samples=256).",
    "[ExplainabilityEngine] SHAP TreeExplainer feature attribution ready.",
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
    <div className={cn("rounded-lg border border-[#2A3944] bg-[#101820] font-mono shadow-none overflow-hidden", className)}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#19242E] border-b border-[#2A3944]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#7895B2]" />
          <span className="text-xs text-[#E7ECEF] font-sans font-medium">{title}</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-[#9AA8B2] hover:text-[#E7ECEF] bg-[#101820] hover:bg-[#202D36] border border-[#2A3944] px-2.5 py-1 rounded transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-[#71A99D]" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      {/* Terminal Output Content */}
      <div className="p-4 space-y-1.5 text-xs font-mono text-[#E7ECEF] max-h-72 overflow-y-auto leading-relaxed">
        {displayedLines.map((line, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="text-[#71A99D] font-bold select-none">&gt;</span>
            <span
              className={
                line.includes("[CRITICAL]") || line.includes("RECOMMEND_BLOCK") || line.includes("QUARANTINE") || line.includes("MALICIOUS")
                  ? "text-[#DF857C] font-semibold"
                  : line.includes("[WARNING]") || line.includes("Heuristic")
                  ? "text-[#D3A35D]"
                  : line.includes("CONNECTED") || line.includes("active") || line.includes("BENIGN")
                  ? "text-[#71A99D]"
                  : "text-[#9AA8B2]"
              }
            >
              {line}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-[#71A99D]">
          <span className="font-bold">&gt;</span>
          <span className="w-2 h-3.5 bg-[#71A99D] inline-block animate-pulse" />
        </div>
      </div>
    </div>
  );
}
export default CyberTerminal;
