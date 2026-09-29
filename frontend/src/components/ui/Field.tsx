import type { ComponentChildren } from "preact";

type FieldSize = "sm" | "md" | "lg" | "xl";

type BaseProps = {
  label?: ComponentChildren;
  /** "strong" = 13px/500 ink label (primary inputs); default = 12px muted. */
  labelStyle?: "muted" | "strong";
  size?: FieldSize;
  placeholder?: string;
  ariaLabel?: string;
  /** Extra content rendered under the input (e.g. a suggestion chip). */
  children?: ComponentChildren;
};

function Label({ label, labelStyle }: { label?: ComponentChildren; labelStyle?: "muted" | "strong" }) {
  if (label == null) return null;
  return <span class={labelStyle === "strong" ? "mg-field__label--strong" : "mg-field__label"}>{label}</span>;
}

function inputClass(size: FieldSize, hasUnit: boolean) {
  return ["mg-input", size !== "md" ? `mg-input--${size}` : "", hasUnit ? "has-unit" : ""].filter(Boolean).join(" ");
}

type NumberFieldProps = BaseProps & {
  /** Raw value — may be a string while the user is typing (e.g. "" or "1."). */
  value: string | number;
  /** Receives the raw input string; coerce with Number(x) || 0 only when computing/saving. */
  onValue: (raw: string) => void;
  unit?: string;
  step?: number | "any";
  min?: number;
  max?: number;
};

export function NumberField({
  label,
  labelStyle,
  size = "md",
  value,
  onValue,
  unit,
  step = "any",
  min,
  max,
  placeholder,
  ariaLabel,
  children,
}: NumberFieldProps) {
  return (
    <label class="mg-field">
      <Label label={label} labelStyle={labelStyle} />
      <span class="mg-input-wrap">
        <input
          type="number"
          class={inputClass(size, !!unit)}
          value={value}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onInput={(e) => onValue((e.currentTarget as HTMLInputElement).value)}
        />
        {unit && <span class="mg-input-unit">{unit}</span>}
      </span>
      {children}
    </label>
  );
}

type TextFieldProps = BaseProps & {
  value: string;
  onValue: (value: string) => void;
  type?: "text" | "password" | "email";
  autoComplete?: string;
  multiline?: boolean;
  rows?: number;
};

export function TextField({
  label,
  labelStyle,
  size = "md",
  value,
  onValue,
  type = "text",
  autoComplete,
  multiline,
  rows = 3,
  placeholder,
  ariaLabel,
  children,
}: TextFieldProps) {
  return (
    <label class="mg-field">
      <Label label={label} labelStyle={labelStyle} />
      {multiline ? (
        <textarea
          class="mg-textarea"
          rows={rows}
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onInput={(e) => onValue((e.currentTarget as HTMLTextAreaElement).value)}
        />
      ) : (
        <input
          type={type}
          class={inputClass(size, false)}
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete={autoComplete}
          onInput={(e) => onValue((e.currentTarget as HTMLInputElement).value)}
        />
      )}
      {children}
    </label>
  );
}

type SelectFieldProps<T extends string> = Omit<BaseProps, "placeholder"> & {
  value: T;
  onValue: (value: T) => void;
  options: { id: T; name: string }[];
};

/**
 * Controlled select. `selected` is set on the matching option too, so the
 * current value shows correctly on first open (see handoff README note).
 */
export function SelectField<T extends string>({
  label,
  labelStyle,
  value,
  onValue,
  options,
  ariaLabel,
  children,
}: SelectFieldProps<T>) {
  return (
    <label class="mg-field">
      <Label label={label} labelStyle={labelStyle} />
      <select
        class="mg-select"
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onValue((e.currentTarget as HTMLSelectElement).value as T)}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id} selected={o.id === value}>
            {o.name}
          </option>
        ))}
      </select>
      {children}
    </label>
  );
}

/** Coerce a raw field value for computation/saving. */
export const num = (v: unknown): number => Number(v) || 0;
