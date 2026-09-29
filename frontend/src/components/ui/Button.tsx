import type { ComponentChildren, JSX } from "preact";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "quiet"
  | "danger"
  | "danger-ghost"
  | "danger-outline";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = Omit<JSX.HTMLAttributes<HTMLButtonElement>, "size" | "icon"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon element. */
  icon?: ComponentChildren;
  /** Trailing icon element. */
  iconRight?: ComponentChildren;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  children,
  class: cls,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = ["mg-btn", `mg-btn--${variant}`, size !== "md" ? `mg-btn--${size}` : "", cls ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} class={classes} {...rest}>
      {icon}
      {children != null && children !== false && <span>{children}</span>}
      {iconRight}
    </button>
  );
}

type IconButtonProps = Omit<JSX.HTMLAttributes<HTMLButtonElement>, "size"> & {
  /** Accessible label; also used as the tooltip. */
  label: string;
  tone?: "default" | "danger";
  size?: "sm" | "lg" | "round";
  disabled?: boolean;
};

export function IconButton({ label, tone = "default", size = "sm", children, class: cls, ...rest }: IconButtonProps) {
  const classes = [
    "mg-iconbtn",
    size !== "sm" ? `mg-iconbtn--${size}` : "",
    tone === "danger" ? "mg-iconbtn--danger" : "",
    cls ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" class={classes} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}
