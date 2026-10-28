type SwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  size?: "sm" | "md" | "lg";
};

/**
 * Pill toggle switch. Click propagation is stopped so it can sit inside a
 * clickable row (e.g. a supply row that also opens a drawer).
 */
export function Switch({ checked, onChange, label, size = "md" }: SwitchProps) {
  const cls = ["mg-switch", size !== "md" ? `mg-switch--${size}` : "", checked ? "is-on" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      class={cls}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      <span class="mg-switch__knob" />
    </button>
  );
}
