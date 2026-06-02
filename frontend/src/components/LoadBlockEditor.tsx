import { useMemo } from 'preact/hooks';
import type { LoadBlock } from '../utils/loadBlocks';
import { computeProfile, makeBlockId } from '../utils/loadBlocks';
import '../css/LoadBlockEditor.css';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);
const HOUR_LABEL = (h: number) => `${String(h).padStart(2, '0')}:00`;

interface LoadBlockEditorProps {
  blocks: LoadBlock[];
  onChange: (blocks: LoadBlock[], profile: number[]) => void;
  baseKw?: number;
}

export default function LoadBlockEditor({ blocks, onChange, baseKw = 0 }: LoadBlockEditorProps) {
  const profile = useMemo(() => computeProfile(blocks, baseKw), [blocks, baseKw]);
  const chartMax = useMemo(() => Math.max(baseKw + 1, ...profile, 1), [baseKw, profile]);

  const emit = (next: LoadBlock[]) => {
    onChange(next, computeProfile(next, baseKw));
  };

  const updateBlock = (id: string, patch: Partial<LoadBlock>) => {
    emit(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const deleteBlock = (id: string) => {
    emit(blocks.filter((b) => b.id !== id));
  };

  const addBlock = () => {
    const newBlock: LoadBlock = {
      id: makeBlockId(),
      label: 'New Block',
      startHour: 0,
      endHour: 6,
      valueKw: baseKw,
    };
    emit([...blocks, newBlock]);
  };

  return (
    <div class="lbe-root">
      {/* Bar chart */}
      <div class="lbe-chart-wrap">
        <div class="lbe-chart-bars">
          {profile.map((v, idx) => {
            const h = Math.max(8, Math.round((v / chartMax) * 100));
            return (
              <div
                key={idx}
                class="lbe-bar"
                title={`${idx}:00 — ${v.toFixed(1)} kW`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        <div class="lbe-chart-labels">
          {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
            <span key={h}>{HOUR_LABEL(h)}</span>
          ))}
        </div>
      </div>

      {/* Block list */}
      <div class="lbe-blocks">
        {blocks.map((block) => (
          <div key={block.id} class="lbe-block">
            <div class="lbe-block-header">
              <input
                type="text"
                class="lbe-label-input"
                value={block.label}
                onInput={(e) => updateBlock(block.id, { label: (e.target as HTMLInputElement).value })}
                aria-label="Block label"
              />
              <span class="lbe-block-kw">{block.valueKw.toFixed(1)} kW</span>
              <button
                type="button"
                class="lbe-delete-btn"
                onClick={() => deleteBlock(block.id)}
                aria-label={`Delete ${block.label}`}
              >
                &times;
              </button>
            </div>
            <div class="lbe-block-fields">
              <label class="lbe-field">
                <span>Start</span>
                <select
                  class="lbe-select"
                  value={block.startHour}
                  onChange={(e) =>
                    updateBlock(block.id, { startHour: Number((e.target as HTMLSelectElement).value) })
                  }
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>{HOUR_LABEL(h)}</option>
                  ))}
                </select>
              </label>
              <label class="lbe-field">
                <span>End</span>
                <select
                  class="lbe-select"
                  value={block.endHour === 24 ? 0 : block.endHour}
                  onChange={(e) => {
                    const raw = Number((e.target as HTMLSelectElement).value);
                    updateBlock(block.id, { endHour: raw === 0 ? 24 : raw });
                  }}
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>{HOUR_LABEL(h)}</option>
                  ))}
                </select>
              </label>
              <label class="lbe-field">
                <span>Load (kW)</span>
                <input
                  type="number"
                  class="lbe-input"
                  min={baseKw}
                  step={0.1}
                  value={block.valueKw}
                  onInput={(e) =>
                    updateBlock(block.id, { valueKw: Number((e.target as HTMLInputElement).value) })
                  }
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button type="button" class="lbe-add-btn" onClick={addBlock}>
        + Add time block
      </button>
    </div>
  );
}