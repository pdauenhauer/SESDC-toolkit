import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Check, ChevronDown, Pencil, Plus, Search, Trash2 } from "lucide-preact";
import type { Project } from "../../database/models/metadata";
import { IconButton, STROKE } from "../ui";
import { leafCount, relativeTime } from "../workbench/model";

type ProjectSwitcherProps = {
  projects: Project[];
  activeId: string;
  activeName: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (project: Project) => void;
};

/** Breadcrumb project name that opens a searchable project popover. */
export default function ProjectSwitcher({ projects, activeId, activeName, onSelect, onNew, onRename, onDelete }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search only when the popover opens (not when a rename starts, which
  // would blur — and so immediately commit — the rename field).
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !renamingId) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, renamingId]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => !q || (p.name ?? "").toLowerCase().includes(q));
  }, [projects, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setRenamingId(null);
  };

  const commitRename = () => {
    const id = renamingId;
    const name = draft.trim();
    setRenamingId(null);
    const current = projects.find((p) => p.id === id);
    if (id && name && current && name !== current.name) onRename(id, name);
  };

  return (
    <div class="mg-crumbs">
      <span class="mg-crumbs__root">Microgrid Toolkit</span>
      <span class="mg-crumbs__sep">/</span>
      <button type="button" class="mg-crumbs__project" aria-haspopup="listbox" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        <span class="mg-crumbs__name">{activeName}</span>
        <ChevronDown size={16} strokeWidth={STROKE} />
      </button>

      {open && (
        <>
          <div class="mg-pop-scrim" onClick={close} />
          <div class="mg-switcher" role="dialog" aria-label="Switch project">
            <div class="mg-switcher__search">
              <span class="mg-switcher__search-icon">
                <Search size={16} strokeWidth={STROKE} />
              </span>
              <input
                ref={searchRef}
                class="mg-switcher__input"
                placeholder="Search projects"
                value={query}
                onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
              />
            </div>

            <div class="mg-switcher__list" role="listbox">
              {rows.map((p) => {
                const active = p.id === activeId;
                const n = leafCount(p.loads ?? []);
                if (renamingId === p.id) {
                  return (
                    <div key={p.id} class="mg-switcher__row is-active">
                      <input
                        class="mg-switcher__rename"
                        value={draft}
                        aria-label="Project name"
                        ref={(el) => el?.focus()}
                        onInput={(e) => setDraft((e.currentTarget as HTMLInputElement).value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={p.id}
                    role="option"
                    aria-selected={active}
                    tabIndex={0}
                    class={`mg-switcher__row${active ? " is-active" : ""}`}
                    onClick={() => {
                      onSelect(p.id);
                      close();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onSelect(p.id);
                        close();
                      }
                    }}
                  >
                    <span class="mg-switcher__text">
                      <span class="mg-switcher__name">{p.name || "Untitled project"}</span>
                      <span class="mg-switcher__meta">
                        {n} load{n === 1 ? "" : "s"} · edited {relativeTime(p.updatedAt)}
                      </span>
                    </span>
                    <span class="mg-switcher__actions">
                      <IconButton
                        label="Rename project"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDraft(p.name ?? "");
                          setRenamingId(p.id);
                        }}
                      >
                        <Pencil size={15} strokeWidth={STROKE} />
                      </IconButton>
                      <IconButton
                        label="Delete project"
                        tone="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(p);
                        }}
                      >
                        <Trash2 size={15} strokeWidth={STROKE} />
                      </IconButton>
                    </span>
                    {active && (
                      <span class="mg-switcher__tick">
                        <Check size={16} strokeWidth={STROKE} />
                      </span>
                    )}
                  </div>
                );
              })}
              {!rows.length && <div class="mg-switcher__empty">{projects.length ? "No matching projects" : "No projects yet"}</div>}
            </div>

            <div class="mg-switcher__divider" />
            <button
              type="button"
              class="mg-switcher__new"
              onClick={() => {
                close();
                onNew();
              }}
            >
              <Plus size={16} strokeWidth={STROKE} />
              <span>New project</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
