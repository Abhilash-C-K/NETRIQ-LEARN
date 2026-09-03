import React from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export function BorderBeam({
  className,
  duration = 6,
  borderWidth = 1.5,
  colorFrom = "#06b6d4",
  colorTo = "#3b82f6",
  delay = 0,
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute -inset-[1.5px] rounded-[inherit] overflow-hidden p-[1.5px] z-0",
        className
      )}
    >
      {/* 360-degree Rotating Conic Laser Light Beam */}
      <motion.div
        className="absolute -inset-[150%] aspect-square origin-center"
        style={{
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${colorFrom} 40deg, ${colorTo} 90deg, transparent 140deg)`,
        }}
        animate={{ rotate: [0, 360] }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          delay,
        }}
      />
    </div>
  );
}
