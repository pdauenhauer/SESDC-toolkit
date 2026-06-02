import { useEffect, useState } from 'preact/hooks';
import { StepProps } from '../types';
import type { LoadPattern, BuildingSize } from '../../../utils/loadProfiler';
import {
  BUILDING_SIZE_COPY,
  BUILDING_SIZE_PEAK_KW,
  buildHourlyLoads
} from '../../../utils/loadProfiler';
import LoadBlockEditor from '../../LoadBlockEditor';
import type { LoadBlock } from '../../../utils/loadBlocks';
import { computeProfile, makeBlockId } from '../../../utils/loadBlocks';

interface LoadsStepProps extends StepProps {
  setData: (data: any) => void;
  onFinish: () => void;
  onValidationSync?: () => void;
  /** Called once both usagePattern and buildingSize have been selected.
   *  In tutorial tour mode this triggers the advance to the next step. */
  onSelectionReady?: () => void;
}

export default function LoadsStep({ data, setData, onFinish, onBack, onValidationSync, onSelectionReady }: LoadsStepProps) {
  const lp = data.loadProfiler ?? { baseLoadKw: 0 };
  const pattern = lp.usagePattern ?? lp.pattern;
  const buildingSize = lp.buildingSize;
  const baseLoadKw = typeof lp.baseLoadKw === 'number' ? lp.baseLoadKw : 0;

  const initBlocks = (): LoadBlock[] => {
    if (lp.blocks && Array.isArray(lp.blocks) && lp.blocks.length > 0) return lp.blocks;
    return [
      { id: makeBlockId(), label: 'Morning',   startHour: 6,  endHour: 12, valueKw: Math.max(baseLoadKw, 2) },
      { id: makeBlockId(), label: 'Afternoon', startHour: 12, endHour: 18, valueKw: Math.max(baseLoadKw, 2.5) },
      { id: makeBlockId(), label: 'Evening',   startHour: 18, endHour: 24, valueKw: Math.max(baseLoadKw, 3) },
      { id: makeBlockId(), label: 'Night',     startHour: 0,  endHour: 6,  valueKw: Math.max(baseLoadKw, 1) },
    ];
  };

  const [blocks, setBlocks] = useState<LoadBlock[]>(initBlocks);

  const handleBlocksChange = (nextBlocks: LoadBlock[], profile: number[]) => {
    setBlocks(nextBlocks);
    setData({
      ...data,
      loads: profile,
      loadProfiler: {
        ...lp,
        blocks: nextBlocks,
        baseLoadKw
      }
    });
  };

  const applyPreset = (p: LoadPattern, size: BuildingSize, base: number) => {
    const loads = buildHourlyLoads(p, size, base);
    const nextBlocks: LoadBlock[] = [
      {
        id: makeBlockId(),
        label: 'Morning',
        startHour: 6,
        endHour: 12,
        valueKw: Math.max(base, Math.round((loads.slice(6, 12).reduce((a, b) => a + b, 0) / 6) * 10) / 10)
      },
      {
        id: makeBlockId(),
        label: 'Afternoon',
        startHour: 12,
        endHour: 18,
        valueKw: Math.max(base, Math.round((loads.slice(12, 18).reduce((a, b) => a + b, 0) / 6) * 10) / 10)
      },
      {
        id: makeBlockId(),
        label: 'Evening',
        startHour: 18,
        endHour: 24,
        valueKw: Math.max(base, Math.round((loads.slice(18, 24).reduce((a, b) => a + b, 0) / 6) * 10) / 10)
      },
      {
        id: makeBlockId(),
        label: 'Night',
        startHour: 0,
        endHour: 6,
        valueKw: Math.max(base, Math.round((loads.slice(0, 6).reduce((a, b) => a + b, 0) / 6) * 10) / 10)
      }
    ];
    setBlocks(nextBlocks);
    setData({
      ...data,
      loads,
      loadProfiler: { usagePattern: p, pattern: p, buildingSize: size, baseLoadKw: base, blocks: nextBlocks }
    });
  };

  const setPattern = (p: LoadPattern) => {
    setData({
      ...data,
      loadProfiler: { ...lp, usagePattern: p, pattern: p, buildingSize: undefined, baseLoadKw }
    });
  };

  const setBuildingSize = (size: BuildingSize) => {
    if (!pattern) return;
    applyPreset(pattern, size, baseLoadKw);
    if (onSelectionReady) onSelectionReady();
  };

  const onBaseLoadChange = (raw: string) => {
    const b = Math.max(0, Math.min(500, Number(raw) || 0));
    const nextBlocks = blocks.map((block) => ({ ...block, valueKw: Math.max(b, block.valueKw) }));
    setBlocks(nextBlocks);
    const profile = computeProfile(nextBlocks, b);
    setData({
      ...data,
      loads: profile,
      loadProfiler: { ...lp, blocks: nextBlocks, baseLoadKw: b }
    });
  };

  useEffect(() => {
    if (onValidationSync) onValidationSync();
  }, [pattern, buildingSize]);

  return (
    <div class="step-container">
      <h2 class="wizard-step-title">Smart Load Profiler</h2>
      <div class="wizard-content" style={{ marginTop: '14px' }}>
        <section>
          <label style={{ marginBottom: '10px' }}>Step 1: Usage pattern</label>
          <div id="input-loads-presets" class="preset-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setPattern('residential')}
              style={{ pointerEvents: 'auto' }}
              class={pattern === 'residential' ? 'card card-active' : 'card'}
            >
              <strong>Residential</strong>
              <small>Evening peak — typical homes and dwellings</small>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setPattern('commercial')}
              style={{ pointerEvents: 'auto' }}
              class={pattern === 'commercial' ? 'card card-active' : 'card'}
            >
              <strong>Commercial</strong>
              <small>Daytime peak — offices, retail, and light industry</small>
            </div>
          </div>
        </section>

        {pattern && (
          <section>
            <label style={{ marginBottom: '10px' }}>Building size</label>
            <div class="preset-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
              {(['small', 'medium', 'large'] as const).map((size) => {
                const copy = BUILDING_SIZE_COPY[pattern][size];
                const selected = buildingSize === size;
                const range =
                  size === 'small' ? '~0.5-1 kW' :
                  size === 'medium' ? '~2-5 kW' :
                  '~5-15+ kW';
                return (
                  <div
                    key={size}
                    role="button"
                    tabIndex={0}
                    onClick={() => setBuildingSize(size)}
                    class={selected ? 'card card-active h-full' : 'card h-full'}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', pointerEvents: 'auto' }}
                  >
                    <strong style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                      <span>{copy.title}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>{range}</span>
                    </strong>
                    <small style={{ marginTop: '8px' }}>{copy.sub}</small>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section class="advanced-section" style={{ marginTop: '16px' }}>
          <label style={{ marginTop: 0 }}>Base load (always on)</label>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#64748b' }}>
            Minimum kW drawn all hours (fridge, standby, networking)
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '220px' }}>
            <input
              type="number"
              min={0}
              step={0.1}
              value={baseLoadKw}
              onInput={(e) => onBaseLoadChange((e.target as HTMLInputElement).value)}
              class="big-input"
            />
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>kW</span>
          </div>
        </section>

        <section style={{ marginTop: '16px' }}>
          <label id="input-loads-manual">
            Step 2: Manual override
          </label>
          <div style={{ minHeight: '320px', marginTop: '8px', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#f8fafc' }}>
            <LoadBlockEditor
              blocks={blocks}
              onChange={handleBlocksChange}
              baseKw={baseLoadKw}
            />
          </div>
        </section>
      </div>
      <div class="wizard-actions">
        <button type="button" class="btn-secondary" onClick={onBack}>
          Previous
        </button>
        <button type="button" class="btn-primary" onClick={onFinish}>
          Create Project
        </button>
      </div>
    </div>
  );
}