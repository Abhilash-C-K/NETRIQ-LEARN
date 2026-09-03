import React from "react";
import { cn } from "../../lib/utils";

export function RippleBackground({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className,
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] overflow-hidden",
        className
      )}
    >
      {Array.from({ length: numCircles }).map((_, i) => {
        const size = mainCircleSize + i * 70;
        const opacity = mainCircleOpacity - i * 0.025;
        const animationDelay = `${i * 0.15}s`;
        const borderStyle = i % 2 === 0 ? "solid" : "dashed";

        return (
          <div
            key={i}
            className="absolute rounded-full border border-teal-400/25 bg-teal-500/5 shadow-glow-teal animate-ripple"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity: Math.max(0.02, opacity),
              animationDelay,
              borderStyle,
            }}
          />
        );
      })}
    </div>
  );
}
