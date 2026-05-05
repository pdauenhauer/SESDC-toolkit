import { useEffect, useMemo, useState } from 'preact/hooks';
import { StepProps } from '../types';
import type { LoadPattern, BuildingSize } from '../../../utils/loadProfiler';
import {
  BUILDING_SIZE_COPY,
  BUILDING_SIZE_PEAK_KW,
  buildHourlyLoads
} from '../../../utils/loadProfiler';

interface LoadsStepProps extends StepProps {
  setData: (data: any) => void;
  onFinish: () => void;
  onValidationSync?: () => void;
}

type BlockConfig = {
  key: 'morning' | 'afternoon' | 'evening' | 'night';
  label: string;
  startHour: number;
  endHour: number;
  valueKw: number;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);
const HOUR_LABEL = (h: number) => `${String(h).padStart(2, '0')}:00`;

function hoursInRange(startHour: number, endHour: number): number[] {
  if (startHour === endHour) return HOUR_OPTIONS;
  if (startHour < endHour) return HOUR_OPTIONS.filter((h) => h >= startHour && h < endHour);
  return HOUR_OPTIONS.filter((h) => h >= startHour || h < endHour);
}

export default function LoadsStep({ data, setData, onFinish, onBack, onValidationSync }: LoadsStepProps) {
  const lp = data.loadProfiler ?? { baseLoadKw: 0 };
  const pattern = lp.usagePattern ?? lp.pattern;
  const buildingSize = lp.buildingSize;
  const baseLoadKw = typeof lp.baseLoadKw === 'number' ? lp.baseLoadKw : 0;

  const [blocks, setBlocks] = useState<BlockConfig[]>([
    { key: 'morning', label: 'Morning', startHour: 6, endHour: 12, valueKw: Math.max(baseLoadKw, 2) },
    { key: 'afternoon', label: 'Afternoon', startHour: 12, endHour: 18, valueKw: Math.max(baseLoadKw, 2.5) },
    { key: 'evening', label: 'Evening', startHour: 18, endHour: 24, valueKw: Math.max(baseLoadKw, 3) },
    { key: 'night', label: 'Night', startHour: 0, endHour: 6, valueKw: Math.max(baseLoadKw, 1) }
  ]);

  const pushLoadsFromBlocks = (nextBlocks: BlockConfig[], nextBaseLoad: number, nextPattern = pattern, nextSize = buildingSize) => {
    const nextLoads = Array.from({ length: 24 }, () => nextBaseLoad);
    for (const block of nextBlocks) {
      const clamped = Math.max(nextBaseLoad, Math.round(block.valueKw * 100) / 100);
      for (const h of hoursInRange(block.startHour, block.endHour)) {
        nextLoads[h] = Math.max(nextLoads[h], clamped);
      }
    }
    setData({
      ...data,
      loads: nextLoads,
      loadProfiler: {
        ...lp,
        usagePattern: nextPattern,
        pattern: nextPattern,
        buildingSize: nextSize,
        baseLoadKw: nextBaseLoad
      }
    });
  };

  const applyPreset = (p: LoadPattern, size: BuildingSize, base: number) => {
    const loads = buildHourlyLoads(p, size, base);
    const nextBlocks: BlockConfig[] = [
      {
        key: 'morning',
        label: 'Morning',
        startHour: 6,
        endHour: 12,
        valueKw: Math.max(base, Math.round((loads.slice(6, 12).reduce((a, b) => a + b, 0) / 6) * 10) / 10)
      },
      {
        key: 'afternoon',
        label: 'Afternoon',
        startHour: 12,
        endHour: 18,
        valueKw: Math.max(base, Math.round((loads.slice(12, 18).reduce((a, b) => a + b, 0) / 6) * 10) / 10)
      },
      {
        key: 'evening',
        label: 'Evening',
        startHour: 18,
        endHour: 24,
        valueKw: Math.max(base, Math.round((loads.slice(18, 24).reduce((a, b) => a + b, 0) / 6) * 10) / 10)
      },
      {
        key: 'night',
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
      loadProfiler: { usagePattern: p, pattern: p, buildingSize: size, baseLoadKw: base }
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
  };

  const onBaseLoadChange = (raw: string) => {
    const b = Math.max(0, Math.min(500, Number(raw) || 0));
    const nextBlocks = blocks.map((block) => ({ ...block, valueKw: Math.max(b, block.valueKw) }));
    setBlocks(nextBlocks);
    pushLoadsFromBlocks(nextBlocks, b);
  };

  const peakHint =
    pattern && buildingSize ? BUILDING_SIZE_PEAK_KW[pattern][buildingSize] + baseLoadKw : 24;

  useEffect(() => {
    if (onValidationSync) onValidationSync();
  }, [pattern, buildingSize, onValidationSync]);

  const chartMax = useMemo(() => Math.max(baseLoadKw + 1, peakHint, ...data.loads, 1), [baseLoadKw, data.loads, peakHint]);

  const updateBlock = (key: BlockConfig['key'], patch: Partial<BlockConfig>) => {
    const nextBlocks = blocks.map((b) => (b.key === key ? { ...b, ...patch } : b));
    setBlocks(nextBlocks);
    pushLoadsFromBlocks(nextBlocks, baseLoadKw);
  };

  return (
    <div class="step-container">
      <h2 class="wizard-step-title">Smart Load Profiler</h2>
      <div class="wizard-content" style={{ marginTop: '14px' }}>
        <section>
          <label style={{ marginBottom: '10px' }}>Step 1: Usage pattern</label>
          <div id="input-loads-presets" class="preset-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setPattern('residential')}
              class={pattern === 'residential' ? 'card card-active' : 'card'}
            >
              <strong>Residential</strong>
              <small>Evening peak — typical homes and dwellings</small>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setPattern('commercial')}
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
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}
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
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))', gap: '3px', alignItems: 'end', height: '120px' }}>
                {data.loads.map((v: number, idx: number) => {
                  const h = Math.max(8, Math.round((v / chartMax) * 100));
                  return (
                    <div key={idx} title={`${idx}:00 - ${v.toFixed(1)} kW`} style={{ height: `${h}px`, background: '#037f6f', borderRadius: '4px 4px 2px 2px', opacity: 0.9 }} />
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '4px', marginTop: '8px', fontSize: '0.72rem', color: '#64748b' }}>
                {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                  <span key={h} style={{ textAlign: 'center' }}>{HOUR_LABEL(h)}</span>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {blocks.map((block) => (
                <div key={block.key} class="advanced-section" style={{ marginTop: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{block.label}</strong>
                    <span style={{ fontWeight: 700, color: '#037f6f' }}>{block.valueKw.toFixed(1)} kW</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', alignItems: 'end' }}>
                    <label style={{ margin: 0 }}>
                      Start
                      <select
                        class="big-input"
                        value={block.startHour}
                        onChange={(e) => updateBlock(block.key, { startHour: Number((e.target as HTMLSelectElement).value) })}
                      >
                        {HOUR_OPTIONS.map((h) => (
                          <option key={h} value={h}>{HOUR_LABEL(h)}</option>
                        ))}
                      </select>
                    </label>
                    <label style={{ margin: 0 }}>
                      End
                      <select
                        class="big-input"
                        value={block.endHour === 24 ? 0 : block.endHour}
                        onChange={(e) => {
                          const raw = Number((e.target as HTMLSelectElement).value);
                          updateBlock(block.key, { endHour: raw === 0 ? 24 : raw });
                        }}
                      >
                        {HOUR_OPTIONS.map((h) => (
                          <option key={h} value={h}>{HOUR_LABEL(h)}</option>
                        ))}
                      </select>
                    </label>
                    <label style={{ margin: 0 }}>
                      Load (kW)
                      <input
                        type="number"
                        min={baseLoadKw}
                        step={0.1}
                        value={block.valueKw}
                        onInput={(e) => updateBlock(block.key, { valueKw: Number((e.target as HTMLInputElement).value) })}
                        class="big-input"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
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
