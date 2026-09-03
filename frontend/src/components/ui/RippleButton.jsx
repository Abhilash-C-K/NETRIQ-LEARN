import React, { useState } from "react";
import { cn } from "../../lib/utils";

export function RippleButton({
  children,
  className,
  rippleColor = "rgba(6, 182, 212, 0.45)",
  duration = "600ms",
  onClick,
  ...props
}) {
  const [buttonRipples, setButtonRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const newRipple = {
      x,
      y,
      size,
      key: Date.now(),
    };

    setButtonRipples((prev) => [...prev, newRipple]);

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      {...props}
      className={cn(
        "relative overflow-hidden inline-flex items-center justify-center rounded-lg px-4 py-2 font-mono text-xs font-semibold shadow-md transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 select-none",
        className
      )}
      onClick={handleClick}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span className="pointer-events-none absolute inset-0 z-0">
        {buttonRipples.map((ripple) => (
          <span
            key={ripple.key}
            className="absolute rounded-full animate-rippling"
            style={{
              top: ripple.y,
              left: ripple.x,
              width: ripple.size,
              height: ripple.size,
              backgroundColor: rippleColor,
              animationDuration: duration,
            }}
            onAnimationEnd={() => {
              setButtonRipples((prev) => prev.filter((r) => r.key !== ripple.key));
            }}
          />
        ))}
      </span>
    </button>
  );
}
