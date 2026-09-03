import React from "react";
import { cn } from "../../lib/utils";

export function BorderBeam({
  className,
  size = 200,
  duration = 12,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "#14b8c4",
  colorTo = "#0891a3",
  delay = 0,
}) {
  return (
    <div
      style={{
        "--size": size,
        "--duration": `${duration}s`,
        "--anchor": `${anchor}%`,
        "--border-width": `${borderWidth}px`,
        "--color-from": colorFrom,
        "--color-to": colorTo,
        "--delay": `-${delay}s`,
      }}
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] border-[length:var(--border-width)] border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]",
        className
      )}
    >
      <div
        className="absolute aspect-square w-[calc(var(--size)*1px)] animate-border-beam bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent"
        style={{
          offsetPath: "rect(0 auto auto 0 round calc(var(--size)*1px))",
          animationDelay: "var(--delay)",
        }}
      />
    </div>
  );
}
