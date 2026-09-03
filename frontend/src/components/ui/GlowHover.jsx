import React, { useEffect, useRef, useState, cloneElement } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "../../lib/utils";

export function GlowHover({
  items = [],
  className = "",
  maskSize = 400,
  glowIntensity = 0.15,
}) {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const itemRefs = useRef([]);
  const overlayItemRefs = useRef([]);
  const [mousePosition, setMousePosition] = useState({ opacity: 0, x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldReduceMotion) return;

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      setMousePosition({
        opacity: 1,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handlePointerLeave = () => {
      setMousePosition((prev) => ({ ...prev, opacity: 0 }));
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [shouldReduceMotion]);

  useEffect(() => {
    if (shouldReduceMotion || !overlayRef.current || !containerRef.current) return;

    const syncCards = () => {
      const container = containerRef.current;
      const overlay = overlayRef.current;
      if (!container || !overlay) return;

      itemRefs.current.forEach((itemEl, index) => {
        const overlayItemEl = overlayItemRefs.current[index];
        if (!itemEl || !overlayItemEl) return;

        const itemRect = itemEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const left = itemRect.left - containerRect.left;
        const top = itemRect.top - containerRect.top;

        overlayItemEl.style.position = "absolute";
        overlayItemEl.style.left = `${left}px`;
        overlayItemEl.style.top = `${top}px`;
        overlayItemEl.style.width = `${itemRect.width}px`;
        overlayItemEl.style.height = `${itemRect.height}px`;
      });
    };

    const observers = [];
    const mutationObserver = new MutationObserver(syncCards);

    for (const itemEl of itemRefs.current) {
      if (!itemEl) continue;
      const observer = new ResizeObserver(() => syncCards());
      observer.observe(itemEl);
      observers.push(observer);
    }

    if (containerRef.current) {
      mutationObserver.observe(containerRef.current, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    syncCards();

    window.addEventListener("scroll", syncCards, { passive: true });
    window.addEventListener("resize", syncCards);

    return () => {
      for (const observer of observers) observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("scroll", syncCards);
      window.removeEventListener("resize", syncCards);
    };
  }, [shouldReduceMotion]);

  const applyGlowStyles = (element, theme, isOverlay = false) => {
    if (!isOverlay) return element;

    const props = element.props || {};
    const existingStyle = props.style || {};
    const existingClassName = props.className || "";

    let glowStyles;

    if (theme) {
      const hsl = `${theme.hue}, ${theme.saturation}%, ${theme.lightness}%`;
      glowStyles = {
        backgroundColor: `hsla(${hsl}, ${glowIntensity})`,
        borderColor: `hsla(${hsl}, 1)`,
        boxShadow: `0 0 0 1px inset hsl(${hsl}), 0 0 20px hsla(${hsl}, ${glowIntensity})`,
      };
    } else {
      const brandColor = "rgba(6, 182, 212, 0.9)";
      const brandWithOpacity = `rgba(6, 182, 212, ${glowIntensity})`;
      glowStyles = {
        backgroundColor: brandWithOpacity,
        borderColor: brandColor,
        boxShadow: `0 0 0 1px inset ${brandColor}, 0 0 20px ${brandWithOpacity}`,
      };
    }

    return cloneElement(element, {
      ...props,
      className: cn(existingClassName, "glow-overlay-item"),
      style: { ...existingStyle, ...glowStyles },
    });
  };

  return (
    <div
      className={cn("relative", className)}
      ref={containerRef}
      style={shouldReduceMotion ? undefined : { willChange: "contents" }}
    >
      <div className="contents">
        {items.map((item, index) =>
          cloneElement(item.element, {
            key: item.id,
            ref: (el) => {
              itemRefs.current[index] = el;
              const existingRef = item.element.props?.ref;
              if (typeof existingRef === "function") {
                existingRef(el);
              } else if (existingRef && typeof existingRef === "object") {
                existingRef.current = el;
              }
            },
          })
        )}
      </div>

      {!shouldReduceMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none"
          ref={overlayRef}
          style={{
            maskImage: `radial-gradient(${maskSize}px ${maskSize}px at ${mousePosition.x}px ${mousePosition.y}px, #000 1%, transparent 50%)`,
            opacity: mousePosition.opacity,
            transition: "opacity 200ms ease, mask-image 200ms ease, -webkit-mask-image 200ms ease",
            WebkitMaskImage: `radial-gradient(${maskSize}px ${maskSize}px at ${mousePosition.x}px ${mousePosition.y}px, #000 1%, transparent 50%)`,
            willChange: "mask-image, opacity",
          }}
        >
          {items.map((item, index) => {
            const glowElement = applyGlowStyles(item.element, item.theme, true);
            return cloneElement(glowElement, {
              key: item.id,
              ref: (el) => {
                overlayItemRefs.current[index] = el;
              },
            });
          })}
        </div>
      )}
    </div>
  );
}
