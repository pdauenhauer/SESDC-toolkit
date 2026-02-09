import { useState } from "preact/hooks";
import type { Load } from "../database/models/load";
import { getLoadLabelById } from "../data/loadLabels";
import {
  updateLoadInTree,
  addChildToLoad,
  createNewLoad,
} from "../utils/loadUtils";
import LoadCard from "./Load";

interface WorkbenchProps {
  loads: Load[];
  setLoads: (value: Load[] | ((prev: Load[]) => Load[])) => void;
}

export type { Load as WorkbenchLoad };

export default function Workbench({ loads, setLoads }: WorkbenchProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: DragEvent, id: string) => {
    setDraggedId(id);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e: DragEvent, id: string) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    if (draggedId && draggedId !== id) setDragOverId(id);
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = (e: DragEvent, dropId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedId || draggedId === dropId) {
      setDraggedId(null);
      return;
    }
    setLoads((prev) => {
      const fromIndex = prev.findIndex((c) => c.id === draggedId);
      const toIndex = prev.findIndex((c) => c.id === dropId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
    setDraggedId(null);
  };

  const handleUpdate = (id: string, patch: Partial<Load>) => {
    setLoads((prev) => updateLoadInTree(prev, id, patch));
  };

  const handleRemove = (id: string) => {
    setLoads((prev) => updateLoadInTree(prev, id, null));
  };

  const handleAddChild = (parentId: string) => {
    setLoads((prev) => addChildToLoad(prev, parentId, createNewLoad()));
  };

  return (
    <div class="workbench">
      {loads.length === 0 ? (
        <div class="workbench-empty">
          <p>No loads yet. Use “Add new Component” in the toolbar to add loads.</p>
        </div>
      ) : (
        <div class="workbench-grid">
          {loads.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              onUpdate={(patch: Partial<Load>) => handleUpdate(load.id, patch)}
              onRemove={() => handleRemove(load.id)}
              onAddChild={
                getLoadLabelById(load.labelId)?.canNest
                  ? () => handleAddChild(load.id)
                  : undefined
              }
              childLoads={load.children ?? []}
              onRemoveChild={handleRemove}
              onUpdateChild={(id: string, patch: Partial<Load>) => handleUpdate(id, patch)}
              draggable
              isDragging={draggedId === load.id}
              isDragOver={dragOverId === load.id}
              onDragStart={(e: DragEvent) => handleDragStart(e, load.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e: DragEvent) => handleDragOver(e, load.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e: DragEvent) => handleDrop(e, load.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
