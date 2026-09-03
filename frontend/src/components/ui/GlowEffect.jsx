import * as React from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

const OCEAN_GLOW_COLORS = ["#06b6d4", "#0284c7", "#38bdf8", "#0891b2", "#06b6d4"];

export function GlowEffect({
  colors = OCEAN_GLOW_COLORS,
  mode = "rotate",
  blur = "strongest",
  duration = 5,
  scale = 1,
  className,
}) {
  const blurClasses = {
    soft: "blur-md opacity-60",
    medium: "blur-lg opacity-70",
    strong: "blur-xl opacity-80",
    strongest: "blur-2xl opacity-85",
  };

  const gradientStyle = {
    backgroundImage: `conic-gradient(from 0deg, ${colors.join(", ")})`,
  };

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      <motion.div
        className={cn(
          "w-full h-full origin-center scale-150",
          blurClasses[blur] || blurClasses.strongest
        )}
        style={{ ...gradientStyle, transform: `scale(${scale})` }}
        animate={
          mode === "rotate"
            ? { rotate: [0, 360] }
            : { scale: [1 * scale, 1.15 * scale, 1 * scale], opacity: [0.6, 0.9, 0.6] }
        }
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
