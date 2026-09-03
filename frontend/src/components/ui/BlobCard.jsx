import * as React from "react";
import { FluidBlobs } from "./FluidBlobs";
import { GlowEffect } from "./GlowEffect";
import { cn } from "../../lib/utils";

const DEFAULT_LIGHT = ["#06b6d4", "#3b82f6", "#6366f1", "#a855f7"];
const DEFAULT_DARK = ["#0891b2", "#1d4ed8", "#4f46e5", "#7e22ce"];
const DEFAULT_GLOW = ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];

export function BlobCard({
  header,
  children,
  headerHeight = 224,
  lightColors = DEFAULT_LIGHT,
  darkColors = DEFAULT_DARK,
  glowColors = DEFAULT_GLOW,
  className,
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <div className="absolute -inset-[1.5px] rounded-[21.5px] overflow-hidden z-0">
        <GlowEffect
          colors={glowColors}
          mode="rotate"
          blur="strongest"
          duration={5}
          scale={1}
        />
      </div>

      <div className="relative z-10 rounded-[20px] overflow-hidden bg-slate-900 border border-slate-800/80 shadow-2xl">
        <div
          className="relative overflow-hidden rounded-t-[20px]"
          style={{ height: headerHeight }}
        >
          <FluidBlobs
            lightColors={lightColors}
            darkColors={darkColors}
            origins={[
              { x: 50, y: -55 },
              { x: 50, y: -25 },
              { x: 50, y: -25 },
              { x: 50, y: -25 },
            ]}
            margin={60}
            blur={50}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/40 to-slate-900 pointer-events-none" />
          {header && <div className="relative z-10 p-6 pb-0">{header}</div>}
        </div>

        {children && <div className="relative z-10">{children}</div>}
      </div>
    </div>
  );
}
