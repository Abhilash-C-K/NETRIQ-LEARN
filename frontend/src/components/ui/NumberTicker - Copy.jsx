import React, { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";
import { cn } from "../../lib/utils";

export function NumberTicker({
  value = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
}) {
  const ref = useRef(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 200,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isInView) {
      setTimeout(() => {
        motionValue.set(direction === "down" ? 0 : value);
      }, delay * 1000);
    }
  }, [motionValue, isInView, delay, value, direction]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(Number(latest.toFixed(decimalPlaces)));
      }
    });
  }, [springValue, decimalPlaces]);

  return (
    <span
      className={cn(
        "inline-block font-mono tracking-tight text-slate-100",
        className
      )}
      ref={ref}
    >
      {value}
    </span>
  );
}
