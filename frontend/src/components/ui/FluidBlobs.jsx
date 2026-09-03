import * as React from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export function FluidBlobs({
  lightColors = ["#06b6d4", "#3b82f6", "#6366f1", "#a855f7"],
  darkColors = ["#0891b2", "#1d4ed8", "#4f46e5", "#7e22ce"],
  origins,
  margin = 60,
  blur = 50,
  className,
}) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <div
        className="absolute inset-0 w-full h-full"
        style={{ filter: `blur(${blur}px)` }}
      >
        <motion.div
          className="absolute -top-16 left-1/4 w-72 h-72 rounded-full"
          style={{ backgroundColor: darkColors[0] || "#0891b2", opacity: 0.7 }}
          animate={{
            x: [0, 45, -35, 0],
            y: [0, 35, -25, 0],
            scale: [1, 1.25, 0.9, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/4 -right-12 w-80 h-80 rounded-full"
          style={{ backgroundColor: darkColors[1] || "#1d4ed8", opacity: 0.6 }}
          animate={{
            x: [0, -55, 25, 0],
            y: [0, -45, 35, 0],
            scale: [1, 0.85, 1.2, 1],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-16 left-1/3 w-80 h-80 rounded-full"
          style={{ backgroundColor: darkColors[2] || "#4f46e5", opacity: 0.5 }}
          animate={{
            x: [0, 35, -45, 0],
            y: [0, -35, 25, 0],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-10 w-60 h-60 rounded-full"
          style={{ backgroundColor: darkColors[3] || "#7e22ce", opacity: 0.4 }}
          animate={{
            x: [0, -30, 40, 0],
            y: [0, 20, -30, 0],
            scale: [0.9, 1.1, 0.95, 0.9],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
