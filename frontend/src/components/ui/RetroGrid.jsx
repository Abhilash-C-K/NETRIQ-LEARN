import React from "react";
import { cn } from "../../lib/utils";

export function RetroGrid({ className, angle = 65 }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden opacity-40 [perspective:200px]",
        className
      )}
      style={{ "--grid-angle": `${angle}deg` }}
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div className="animate-grid [background-repeat:repeat] [background-size:60px_60px] [height:300vh] [inset:0%_0px] [margin-left:-50%] [transform-origin:100%_0_0] [width:200vw] [background-image:linear-gradient(to_right,rgba(20,184,196,0.22)_1px,transparent_0),linear-gradient(to_bottom,rgba(20,184,196,0.22)_1px,transparent_0)]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
    </div>
  );
}
