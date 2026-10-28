import { useState } from "preact/hooks";
import { Plus, X } from "lucide-preact";
import { STROKE } from "./icons";

/** Starter tags offered on every building; users can also type their own. */
export const SUGGESTED_TAGS = ["Residential", "Productive use", "Commercial", "Community / Institutional"];

const norm = (t: string) => t.trim().replace(/\s+/g, " ");
const has = (list: string[], t: string) => list.some((x) => x.toLowerCase() === t.toLowerCase());

type TagInputProps = {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  /** Extra suggestions (e.g. custom tags already used elsewhere in the project). */
  suggestions?: string[];
};

/** Chip list + free-text entry. Enter or comma adds a tag; suggestions add on click. */
export function TagInput({ label, value, onChange, suggestions = [] }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const add = (...raws: string[]) => {
    const next = [...value];
    for (const raw of raws) {
      const t = norm(raw);
      if (t && !has(next, t)) next.push(t);
    }
    if (next.length !== value.length) onChange(next);
    setDraft("");
  };
  const remove = (t: string) => onChange(value.filter((x) => x !== t));

  const offered = [...SUGGESTED_TAGS, ...suggestions].filter((t, i, all) => !has(value, t) && all.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i);

  return (
    <div class="mg-field mg-tags">
      <span class="mg-field__label">{label}</span>
      <div class="mg-tags__box" onClick={(e) => (e.currentTarget as HTMLElement).querySelector("input")?.focus()}>
        {value.map((t) => (
          <span key={t} class="mg-tag">
            {t}
            <button type="button" class="mg-tag__x" aria-label={`Remove tag ${t}`} onClick={() => remove(t)}>
              <X size={12} strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          class="mg-tags__input"
          value={draft}
          placeholder={value.length ? "" : "Type a tag and press Enter"}
          aria-label={`Add ${label.toLowerCase()}`}
          onInput={(e) => {
            const v = (e.currentTarget as HTMLInputElement).value;
            if (!v.includes(",")) return setDraft(v);
            // Typing or pasting "a, b, c": everything before the last comma becomes tags.
            const parts = v.split(",");
            const rest = parts.pop() ?? "";
            add(...parts);
            setDraft(rest);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => draft && add(draft)}
        />
      </div>
      {offered.length > 0 && (
        <div class="mg-tags__suggest">
          {offered.map((t) => (
            <button key={t} type="button" class="mg-tags__chip" onClick={() => add(t)}>
              <Plus size={12} strokeWidth={STROKE} />
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
