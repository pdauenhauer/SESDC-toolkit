import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";
import { createPortal } from "preact/compat";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Max width in px (config drawer 520, load profiler 760). */
  width?: number;
  /** Accessible name for the dialog. */
  label: string;
  header: ComponentChildren;
  /** Optional row under the header (e.g. source pills), with a hairline below. */
  subheader?: ComponentChildren;
  footer?: ComponentChildren;
  /** Extra class for the scrolling body (spacing variants). */
  bodyClass?: string;
  children: ComponentChildren;
};

/**
 * Right-side sheet: inset 12px, 16px radius, blurred backdrop. Esc and
 * backdrop click both close (callers treat close as "discard draft").
 */
export function Drawer({ open, onClose, width = 520, label, header, subheader, footer, bodyClass, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div class="mg-portal">
      <div class="mg-drawer-backdrop" onClick={onClose} />
      <div
        class="mg-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{ width: `min(${width}px, calc(100vw - 24px))` }}
      >
        <div class="mg-drawer__header">{header}</div>
        {subheader && <div class="mg-drawer__sub">{subheader}</div>}
        <div class={`mg-drawer__body${bodyClass ? ` ${bodyClass}` : ""}`}>{children}</div>
        {footer && <div class="mg-drawer__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
