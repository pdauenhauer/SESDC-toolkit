import { useState, useEffect, useRef } from "preact/hooks";
import type { Load } from "../database/models/load";
import { LOAD_LABELS, getLoadLabelById } from "../data/loadLabels";
import Tooltip from "./Tooltip";
import trashIcon from "../media/trash.svg";
import trashRedIcon from "../media/trash-red.svg";
import LoadBlockEditor from "./LoadBlockEditor";
import { defaultBlocks, computeProfile } from "../utils/loadBlocks";
import type { LoadBlock } from "../utils/loadBlocks";
import "../css/ProjectsPage/load.css";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [draftBlocks, setDraftBlocks] = useState<LoadBlock[]>(load.blocks ?? defaultBlocks());
  const [draftProfile, setDraftProfile] = useState<number[]>(load.profile);
  const menuRef = useRef<HTMLDivElement>(null);

  const label = getLoadLabelById(load.labelId);
  const canNest = label?.canNest ?? false;

  // Parent's 24h chart: own profile + sum of children's profiles (children add onto parent)
  const effectiveProfile =
    canNest && childLoads.length > 0
      ? load.profile.map(
          (p, i) =>
            p + childLoads.reduce((sum, child) => sum + (child.profile[i] ?? 0), 0)
        )
      : load.profile;
  const maxProfile = Math.max(...effectiveProfile, 1);

  // Keep draft in sync when opening menu
  useEffect(() => {
    if (menuOpen) {
      setDraftBlocks(load.blocks ?? defaultBlocks());
      setDraftProfile([...load.profile]);
    }
  }, [menuOpen, load.profile, load.blocks]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        onUpdate({ profile: draftProfile, blocks: draftBlocks });
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, draftProfile, draftBlocks]);

  const handleBlocksChange = (blocks: LoadBlock[], profile: number[]) => {
    setDraftBlocks(blocks);
    setDraftProfile(profile);
  };

  const handleSaveProfile = () => {
    onUpdate({ profile: draftProfile, blocks: draftBlocks });
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

        {/* 24h load profile (parent: own + children; leaf: own only) */}
        <div class="load-card-profile" title={canNest && childLoads.length > 0 ? "24h profile (includes child loads)" : "24-hour load profile"}>
          <div class="load-card-profile-bars">
            {effectiveProfile.map((v, i) => (
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

      <div class="load-card-actions">
        {/* Parent loads: no edit icon; profile = own + children. Child/leaf loads: show edit. */}
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
              aria-label="Edit 24h profile"
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

      {/* Load profile editor popover */}
      {menuOpen && (
        <div ref={menuRef} class="load-profile-editor">
          <div class="load-profile-editor-header">
            <span>Edit load profile</span>
            <button
              type="button"
              class="load-profile-editor-close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close"
            >
              x
            </button>
          </div>
          <div class="load-profile-editor-body">
            <LoadBlockEditor
              blocks={draftBlocks}
              onChange={handleBlocksChange}
            />
          </div>
          <div class="load-profile-editor-footer">
            <button type="button" class="load-profile-editor-save" onClick={handleSaveProfile}>
              Done
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Nested loads (one level) — append to the right of parent */}
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