import type { ComponentChildren } from "preact";
import "../css/Tooltip.css";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  text: string;
  children: ComponentChildren;// wrapped button
  position?: TooltipPosition;
  className?: string;
}

export default function Tooltip({
  text,
  children,
  position = "top",
  className = "",
}: TooltipProps) {
  const classes = ["tooltip", className].filter(Boolean).join(" ");

  return (
    <span class={classes} data-tooltip-position={position}>
      {children}
      <span class="tooltip-content" role="tooltip">
        {text}
      </span>
    </span>
  );
}
