import { useState, useEffect, useRef } from "preact/hooks";
import type { Load, SeasonalProfiles, Season } from "../database/models/load";
import { SEASONS, SEASON_LABELS, defaultSeasonalProfiles } from "../database/models/load";
import { LOAD_LABELS, getLoadLabelById } from "../data/loadLabels";
import Tooltip from "./Tooltip";
import trashIcon from "../media/trash.svg";
import trashRedIcon from "../media/trash-red.svg";
import "../css/ProjectsPage/load.css";

function cloneSP(sp: SeasonalProfiles): SeasonalProfiles {
  return { spring: [...sp.spring], summer: [...sp.summer], fall: [...sp.fall], winter: [...sp.winter] };
}

interface LoadProps {
  load: Load;
  isNested?: boolean;
  onUpdate: (patch: Partial<Load>) => void;
  onRemove: () => void;
  onAddChild?: () => void;
  childLoads?: Load[];
  onRemoveChild?: (id: string) => void;
  onUpdateChild?: (id: string, patch: Partial<Load>) => void;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState<Season>("summer");
  const [draftProfiles, setDraftProfiles] = useState<SeasonalProfiles>(
    () => cloneSP(load.seasonalProfiles ?? defaultSeasonalProfiles())
  );
  const menuRef = useRef<HTMLDivElement>(null);

  const label = getLoadLabelById(load.labelId);
  const canNest = label?.canNest ?? false;

  const displayProfile = load.seasonalProfiles?.[activeSeason] ?? [];

  const effectiveProfile =
    canNest && childLoads.length > 0
      ? displayProfile.map(
          (p, i) =>
            p + childLoads.reduce((sum, child) => sum + (child.seasonalProfiles?.[activeSeason]?.[i] ?? 0), 0)
        )
      : displayProfile;
  const maxProfile = Math.max(...effectiveProfile, 1);

  useEffect(() => {
    if (menuOpen) setDraftProfiles(cloneSP(load.seasonalProfiles ?? defaultSeasonalProfiles()));
  }, [menuOpen, load.seasonalProfiles]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        onUpdate({ seasonalProfiles: draftProfiles });
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, draftProfiles]);

  const handleProfileHourChange = (hourIndex: number, value: number) => {
    setDraftProfiles((prev) => {
      const next = cloneSP(prev);
      next[activeSeason][hourIndex] = Math.max(0, value);
      return next;
    });
  };

  const handleCopyToAllSeasons = () => {
    setDraftProfiles((prev) => {
      const source = [...prev[activeSeason]];
      return { spring: [...source], summer: [...source], fall: [...source], winter: [...source] };
    });
  };

  const handleSaveProfile = () => {
    onUpdate({ seasonalProfiles: draftProfiles });
    setMenuOpen(false);
  };

  const cardClass = [
    "load-card",
    isNested ? "load-card--nested" : "",
    canNest ? "load-card--can-nest" : "",
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
      <div class="load-card-main">
      <div class="load-card-icon" aria-hidden="true">
        {label?.icon ?? "🔌"}
      </div>

      <div class="load-card-body">
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
          <Tooltip text="Edit Name" position="right">
            <button
              type="button"
              class="load-card-name"
              onClick={() => setEditingName(true)}
            >
              {load.name}
            </button>
          </Tooltip>
        )}

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

        <div class="load-card-profile" title={`24h profile (${SEASON_LABELS[activeSeason]})`}>
          <div class="load-card-profile-bars">
            {effectiveProfile.map((v, i) => (
              <div
                key={i}
                class="load-card-profile-bar"
                style={{ height: `${(v / maxProfile) * 100}%` }}
              />
            ))}
          </div>
          <span class="load-card-profile-label">{SEASON_LABELS[activeSeason].slice(0, 3)}</span>
        </div>

        <div class="load-card-season-tabs">
          {SEASONS.map((s) => (
            <button
              key={s}
              type="button"
              class={`load-card-season-tab ${s === activeSeason ? "load-card-season-tab--active" : ""}`}
              onClick={() => setActiveSeason(s)}
              title={SEASON_LABELS[s]}
            >
              {SEASON_LABELS[s].slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div class="load-card-actions">
        {!canNest && (
          <Tooltip text="Edit Load" position="bottom">
            <button
              type="button"
              class="load-card-menu-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              aria-label="Edit seasonal profiles"
              aria-expanded={menuOpen}
            >
              <i class="bx bx-pencil" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
        <Tooltip text="Delete" position="bottom">
          <button
            type="button"
            class="load-card-remove"
            onClick={onRemove}
            aria-label="Remove load"
          >
            <img
              src={trashIcon}
              alt=""
              aria-hidden="true"
              class="load-card-remove-icon load-card-remove-icon--default"
            />
            <img
              src={trashRedIcon}
              alt=""
              aria-hidden="true"
              class="load-card-remove-icon load-card-remove-icon--hover"
            />
          </button>
        </Tooltip>
      </div>

      {menuOpen && (
        <div ref={menuRef} class="load-profile-editor">
          <div class="load-profile-editor-header">
            <span>Edit 24h load profile</span>
            <button
              type="button"
              class="load-profile-editor-close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close"
            >
              x
            </button>
          </div>

          <div class="load-profile-editor-season-tabs">
            {SEASONS.map((s) => (
              <button
                key={s}
                type="button"
                class={`load-profile-editor-season-tab ${s === activeSeason ? "load-profile-editor-season-tab--active" : ""}`}
                onClick={() => setActiveSeason(s)}
              >
                {SEASON_LABELS[s]}
              </button>
            ))}
          </div>

          <div class="load-profile-editor-grid">
            {(draftProfiles[activeSeason] ?? []).map((value, i) => (
              <label key={i} class="load-profile-editor-cell">
                <span class="load-profile-editor-hour">{i}h</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={value}
                  onInput={(e) =>
                    handleProfileHourChange(i, parseFloat((e.target as HTMLInputElement).value) || 0)
                  }
                />
              </label>
            ))}
          </div>
          <div class="load-profile-editor-footer">
            <button type="button" class="load-profile-editor-copy-all" onClick={handleCopyToAllSeasons}>
              Copy to all seasons
            </button>
            <button type="button" class="load-profile-editor-save" onClick={handleSaveProfile}>
              Done
            </button>
          </div>
        </div>
      )}
      </div>

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
