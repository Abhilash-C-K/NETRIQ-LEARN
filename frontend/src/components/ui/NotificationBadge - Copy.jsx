import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "../../lib/utils";

const statusColors = {
  away: "bg-amber-500",
  busy: "bg-rose-500",
  offline: "bg-slate-500",
  online: "bg-emerald-500",
};

const positionClasses = {
  "bottom-left": "-bottom-1 -left-1",
  "bottom-right": "-bottom-1 -right-1",
  "top-left": "-top-1 -left-1",
  "top-right": "-top-1 -right-1",
};

const AnimatedCount = ({ value, max, shouldReduceMotion }) => {
  const displayValue = value > max ? `${max}+` : value.toString();
  const prevValueRef = useRef(value);
  const direction = value > prevValueRef.current ? 1 : -1;

  useEffect(() => {
    prevValueRef.current = value;
  }, [value]);

  if (shouldReduceMotion) {
    return <span className="font-medium leading-none">{displayValue}</span>;
  }

  return (
    <span className="relative overflow-hidden font-medium leading-none">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          className="inline-block"
          exit={{ opacity: 0, y: direction * -12 }}
          initial={{ opacity: 0, y: direction * 12 }}
          key={value}
          transition={{ bounce: 0.1, duration: 0.3, type: "spring" }}
        >
          {displayValue}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export function NotificationBadge({
  variant = "dot",
  count = 0,
  max = 99,
  status = "online",
  showZero = false,
  ping = false,
  position = "top-right",
  children,
  className,
}) {
  const shouldReduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const shouldShow =
      variant === "dot" ||
      variant === "status" ||
      (variant === "count" && (count > 0 || showZero));
    setIsVisible(shouldShow);
  }, [variant, count, showZero]);

  const getBadgeClasses = () => {
    if (variant === "dot") {
      return "h-2.5 w-2.5";
    }
    if (variant === "status") {
      return "h-3 w-3";
    }
    const displayValue = count > max ? `${max}+` : count.toString();
    if (displayValue.length === 1) {
      return "h-5 w-5 text-xs font-bold font-mono";
    }
    if (displayValue.length === 2) {
      return "h-5 min-w-5 px-1 text-xs font-bold font-mono";
    }
    return "h-5 min-w-6 px-1 text-xs font-bold font-mono";
  };

  const getBackgroundColor = () => {
    if (variant === "status") {
      return statusColors[status] || statusColors.online;
    }
    return "bg-rose-500";
  };

  const badgeElement = (
    <AnimatePresence mode="wait">
      {isVisible ? (
        <motion.span
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "absolute flex items-center justify-center rounded-full text-white z-20 shadow-md",
            getBackgroundColor(),
            getBadgeClasses(),
            positionClasses[position],
            variant === "status" && "ring-2 ring-slate-900",
            className
          )}
          exit={
            shouldReduceMotion
              ? { opacity: 0, transition: { duration: 0 } }
              : { opacity: 0, scale: 0, transition: { duration: 0.15 } }
          }
          initial={
            shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0 }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { bounce: 0.2, duration: 0.25, type: "spring" }
          }
        >
          {variant === "count" && (
            <AnimatedCount
              max={max}
              shouldReduceMotion={shouldReduceMotion}
              value={count}
            />
          )}

          {ping && !shouldReduceMotion && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-0 animate-ping rounded-full opacity-75",
                getBackgroundColor()
              )}
            />
          )}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );

  if (!children) {
    return (
      <span className="relative inline-flex">
        <span className="h-4 w-4" />
        {badgeElement}
      </span>
    );
  }

  return (
    <span className="relative inline-flex">
      {children}
      {badgeElement}
    </span>
  );
}

export default NotificationBadge;
