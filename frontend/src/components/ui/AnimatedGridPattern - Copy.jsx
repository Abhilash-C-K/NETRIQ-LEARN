import React, { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 30,
  className,
  maxOpacity = 0.4,
  duration = 4,
  repeatDelay = 0.5,
  ...props
}) {
  const id = useId();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [squares, setSquares] = useState([]);

  const getPos = () => {
    return [
      Math.floor((Math.random() * dimensions.width) / width),
      Math.floor((Math.random() * dimensions.height) / height),
    ];
  };

  const generateSquares = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      pos: getPos(),
    }));
  };

  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      setSquares(generateSquares(numSquares));
    }
  }, [dimensions, numSquares]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-cyan-500/10 stroke-cyan-500/20",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [x, y], id }, index) => (
          <motion.rect
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{
              duration,
              repeat: 1,
              delay: index * 0.1,
              repeatType: "reverse",
            }}
            onAnimationComplete={() => {
              setSquares((prev) =>
                prev.map((sq) =>
                  sq.id === id
                    ? {
                        ...sq,
                        pos: getPos(),
                      }
                    : sq
                )
              );
            }}
            key={`${x}-${y}-${id}`}
            width={width - 1}
            height={height - 1}
            x={x * width + 1}
            y={y * height + 1}
            fill="currentColor"
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  );
}
