import React, { useEffect, useRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../lib/utils";
import { cva } from "class-variance-authority";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const smoothButtonVariants = cva(
  "relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium outline-none ring-offset-background transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 select-none",
  {
    defaultVariants: {
      shape: "default",
      size: "default",
      variant: "default",
    },
    variants: {
      color: {
        accent:
          "[--btn-fg:#fff] [--btn-hover:#0284c7] [--btn:#06b6d4]",
        amber:
          "[--btn-fg:#fff] [--btn-hover:#d97706] [--btn:#f59e0b]",
        blue: "[--btn-fg:#fff] [--btn-hover:#1d4ed8] [--btn:#3b82f6]",
        destructive:
          "[--btn-fg:#fff] [--btn-hover:#be123c] [--btn:#f43f5e]",
        green:
          "[--btn-fg:#fff] [--btn-hover:#047857] [--btn:#10b981]",
        neutral:
          "[--btn-fg:#f8fafc] [--btn-hover:#334155] [--btn:#1e293b]",
      },
      shape: {
        default: "",
        pill: "rounded-full",
        square: "rounded-none",
      },
      size: {
        default: "h-10 gap-2 rounded-md px-4 py-2 text-sm [&_svg]:size-4",
        icon: "size-10 rounded-md [&_svg]:size-4",
        "icon-lg": "size-11 rounded-lg [&_svg]:size-5",
        "icon-sm": "size-9 rounded-md [&_svg]:size-4",
        lg: "h-11 gap-2 rounded-lg px-8 text-base [&_svg]:size-5",
        sm: "h-9 gap-1.5 rounded-md px-3 text-sm [&_svg]:size-4",
        xs: "h-7 gap-1.5 rounded-sm px-2.5 text-xs [&_svg]:size-3.5",
      },
      variant: {
        candy:
          "border-[0.5px] border-white/25 bg-gradient-to-b from-[var(--btn,#06b6d4)] to-[var(--btn-hover,#0284c7)] text-[var(--btn-fg,#fff)] shadow-md hover:brightness-110 [&_svg]:drop-shadow-sm",
        default:
          "bg-slate-800 text-slate-100 border border-slate-700 shadow-sm hover:bg-slate-700 hover:text-white",
        destructive:
          "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-sm hover:from-rose-600 hover:to-rose-700",
        ghost:
          "text-[var(--btn,#94a3b8)] hover:bg-slate-800/60 hover:text-slate-100",
        link: "text-[var(--btn,#38bdf8)] underline-offset-4 hover:underline",
        outline:
          "border border-slate-700 bg-slate-900 text-slate-200 shadow-sm hover:bg-slate-800 hover:text-white",
        secondary:
          "bg-slate-800 text-slate-200 border border-slate-700/60 shadow-xs hover:bg-slate-700/80",
        soft: "bg-[var(--btn,#06b6d4)]/15 text-[var(--btn,#38bdf8)] border border-[var(--btn,#06b6d4)]/30 hover:bg-[var(--btn,#06b6d4)]/25",
        solid:
          "bg-[var(--btn,#06b6d4)] text-[var(--btn-fg,#fff)] shadow-xs hover:bg-[var(--btn-hover,#0284c7)]",
      },
    },
  }
);

const Spinner = () => (
  <svg
    aria-hidden="true"
    className="size-[1em] animate-spin"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
    />
    <path
      className="opacity-90"
      d="M12 2a10 10 0 0 1 10 10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="3"
    />
  </svg>
);

export function SmoothButton({
  className,
  variant,
  color,
  size,
  shape,
  asChild = false,
  loading = false,
  forcePress = false,
  prefix,
  suffix,
  disabled,
  children,
  ref,
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();
  const localRef = useRef(null);

  useEffect(() => {
    const node = localRef.current;
    if (!(forcePress && node) || shouldReduceMotion) {
      return;
    }
    const FORCE_THRESHOLD = 2;
    const onForce = (e) => {
      const force = e.webkitForce ?? 0;
      node.style.transform = force >= FORCE_THRESHOLD ? "scale(0.94)" : "";
    };
    const reset = () => {
      node.style.transform = "";
    };
    node.addEventListener("webkitmouseforcechanged", onForce);
    node.addEventListener("mouseup", reset);
    node.addEventListener("mouseleave", reset);
    return () => {
      node.removeEventListener("webkitmouseforcechanged", onForce);
      node.removeEventListener("mouseup", reset);
      node.removeEventListener("mouseleave", reset);
    };
  }, [forcePress, shouldReduceMotion]);

  const classes = cn(
    smoothButtonVariants({ className, color, shape, size, variant })
  );

  if (asChild) {
    return (
      <Slot className={classes} ref={ref} {...props}>
        {children}
      </Slot>
    );
  }

  const setRefs = (node) => {
    localRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  return (
    <button
      aria-busy={loading || undefined}
      className={classes}
      disabled={disabled || loading}
      ref={setRefs}
      type={props.type ?? "button"}
      {...props}
    >
      <AnimatePresence initial={false}>
        {loading ? (
          <motion.span
            animate={{ marginRight: "0.5rem", opacity: 1, width: "1em" }}
            className="inline-flex shrink-0 items-center justify-center overflow-hidden"
            exit={{ marginRight: 0, opacity: 0, width: 0 }}
            initial={
              shouldReduceMotion
                ? { marginRight: "0.5rem", opacity: 1, width: "1em" }
                : { marginRight: 0, opacity: 0, width: 0 }
            }
            key="spinner"
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { bounce: 0.1, duration: 0.25, type: "spring" }
            }
          >
            <Spinner />
          </motion.span>
        ) : null}
      </AnimatePresence>
      {prefix}
      {children}
      {suffix}
    </button>
  );
}

export default SmoothButton;
export { smoothButtonVariants };
