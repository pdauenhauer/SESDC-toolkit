import { useState } from "preact/hooks";
import type { Load } from "../database/models/load";
import { LOAD_LABELS, getLoadLabelById } from "../data/loadLabels";

interface LoadProps {
  load: Load;
  isNested?: boolean;
  onUpdate: (patch: Partial<Load>) => void;
  onRemove: () => void;
  onAddChild?: () => void;
  childLoads?: Load[];
  onRemoveChild?: (id: string) => void;
  onUpdateChild?: (id: string, patch: Partial<Load>) => void;
  /** When true, card is draggable (e.g. for reorder on workbench). */
  draggable?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: DragEvent) => void;
}

export default function Load({
  load,
  isNested = false,
  onUpdate,
  onRemove,
  onAddChild,
  childLoads = [],
  onRemoveChild,
  onUpdateChild,
  draggable = false,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: LoadProps) {
  const [editingName, setEditingName] = useState(false);
  const label = getLoadLabelById(load.labelId);
  const canNest = label?.canNest ?? false;
  const maxProfile = Math.max(...load.profile, 1);

  const cardClass = [
    "load-card",
    isNested ? "load-card--nested" : "",
    isDragging ? "is-dragging" : "",
    isDragOver ? "is-drag-over" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      class={cardClass}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Picture-style icon */}
      <div class="load-card-icon" aria-hidden="true">
        {label?.icon ?? "🔌"}
      </div>

      <div class="load-card-body">
        {/* Name */}
        {editingName ? (
          <input
            type="text"
            class="load-card-name-input"
            value={load.name}
            onInput={(e) => onUpdate({ name: (e.target as HTMLInputElement).value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
          />
        ) : (
          <button
            type="button"
            class="load-card-name"
            onClick={() => setEditingName(true)}
          >
            {load.name}
          </button>
        )}

        {/* Label dropdown */}
        <select
          class="load-card-label"
          value={load.labelId}
          onInput={(e) => onUpdate({ labelId: (e.target as HTMLSelectElement).value })}
        >
          {LOAD_LABELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        {/* 24h load profile mini chart */}
        <div class="load-card-profile" title="24-hour load profile">
          <div class="load-card-profile-bars">
            {load.profile.map((v, i) => (
              <div
                key={i}
                class="load-card-profile-bar"
                style={{ height: `${(v / maxProfile) * 100}%` }}
              />
            ))}
          </div>
          <span class="load-card-profile-label">24h</span>
        </div>
      </div>

      <button
        type="button"
        class="load-card-remove"
        onClick={onRemove}
        aria-label="Remove load"
      >
        ×
      </button>

      {/* Nested loads (one level) */}
      {canNest && (
        <div class="load-card-children">
          {childLoads.map((child) => (
            <Load
              key={child.id}
              load={child}
              isNested
              onUpdate={(patch) => onUpdateChild?.(child.id, patch)}
              onRemove={() => onRemoveChild?.(child.id)}
              onUpdateChild={onUpdateChild}
              onRemoveChild={onRemoveChild}
              draggable={false}
            />
          ))}
          <button
            type="button"
            class="load-card-add-child"
            onClick={onAddChild}
          >
            + Add load
          </button>
        </div>
      )}
    </div>
  );
}
