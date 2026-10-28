import type { ComponentChildren } from "preact";

export type SegmentedOption<T extends string> = {
  id: T;
  label?: string;
  icon?: ComponentChildren;
  /** Tooltip / accessible name (required for icon-only options). */
  title?: string;
};

type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T | null | undefined;
  onChange: (id: T) => void;
  /** default = 12px items; tabs = header tab bar; icon = square icon-only items. */
  variant?: "default" | "tabs" | "icon";
  ariaLabel?: string;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  variant = "default",
  ariaLabel,
}: SegmentedProps<T>) {
  const cls = ["mg-seg", variant !== "default" ? `mg-seg--${variant}` : ""].filter(Boolean).join(" ");
  return (
    <div class={cls} role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            class={`mg-seg__item${active ? " is-active" : ""}`}
            aria-pressed={active}
            aria-label={o.title ?? o.label}
            title={o.title}
            onClick={() => onChange(o.id)}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
