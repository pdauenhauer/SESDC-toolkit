// src/components/ProjectWizard/TutorialOverlay.tsx
import { useState, useLayoutEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';
import '../../css/TutorialOverlay.css';
import { TutorialStep } from './tutorialData';

interface TutorialOverlayProps {
  steps: TutorialStep[];
  isVisible: boolean;
  onClose: () => void;
  mode: 'tour' | 'help';
  wizardCardRef?: RefObject<HTMLElement | null>;
  onLastStepDone?: () => void;
  onRequestNext?: () => void;
  onRequestPrev?: () => void;
  lastStepButtonLabel?: string;
  /** When set (tour mode), replaces per-screen "Step i of n" with full-tour progress. */
  tourGlobalStepNumber?: number;
  tourGlobalStepTotal?: number;
  tutorialStepIndex: number;
  onTutorialStepIndexChange: (index: number) => void;
  tutorialRunId?: number;
  projectData?: Record<string, unknown>;
}

interface ViewportRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PANEL_W = 280;
const EST_PANEL_H = 260;
const PLACE_GAP = 8;
const VIEW_EDGE = 10;
const PANEL_CLEAR_MARGIN = 6;
const SPOTLIGHT_PADDING = 8;

function getValue(data: Record<string, unknown> | undefined, path: string): unknown {
  if (!data) return undefined;
  return path
    .split('.')
    .reduce(
      (o: unknown, k) => (o != null && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
      data
    );
}

function isRequiredValid(data: Record<string, unknown> | undefined, path: string): boolean {
  const v = getValue(data, path);
  if (path === 'solar.sizeKw' || path === 'battery.storageKwh') return typeof v === 'number' && v > 0;
  if (path === 'battery.type') return v === 'Lithium-Ion' || v === 'Lead-Acid';
  if (path === 'loadProfiler.usagePattern') return !!v;
  if (path === 'loadProfiler.buildingSize') return !!v;
  if (path === 'loadProfiler.selectionReady') {
    const state = (getValue(data, 'loadProfiler') as Record<string, unknown> | undefined) ?? {};
    return !!state.usagePattern && !!state.buildingSize;
  }
  if (path === 'loads') return Array.isArray(v) && v.length === 24 && (v as number[]).some((n) => n > 0);
  return false;
}

function inflateRect(r: ViewportRect, m: number): ViewportRect {
  return {
    top: r.top - m,
    left: r.left - m,
    width: r.width + 2 * m,
    height: r.height + 2 * m
  };
}

function rectsOverlap(a: ViewportRect, b: ViewportRect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

function buildSpotlightPath(viewportW: number, viewportH: number, hole: ViewportRect | null): string {
  if (!hole || hole.width < 1 || hole.height < 1) {
    return `M0 0 H${viewportW} V${viewportH} H0 Z`;
  }
  const x = Math.round(hole.left * 100) / 100;
  const y = Math.round(hole.top * 100) / 100;
  const w = Math.round(hole.width * 100) / 100;
  const h = Math.round(hole.height * 100) / 100;
  return `M0 0 H${viewportW} V${viewportH} H0 Z M${x} ${y} h${w} v${h} h${-w} Z`;
}

function clampRectToViewport(rect: ViewportRect, viewportW: number, viewportH: number): ViewportRect {
  const left = Math.max(0, Math.min(rect.left, viewportW));
  const top = Math.max(0, Math.min(rect.top, viewportH));
  const right = Math.max(left, Math.min(rect.left + rect.width, viewportW));
  const bottom = Math.max(top, Math.min(rect.top + rect.height, viewportH));
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
}

function computeBlockerRects(viewportW: number, viewportH: number, hole: ViewportRect | null): ViewportRect[] {
  if (!hole || hole.width < 1 || hole.height < 1) {
    return [{ top: 0, left: 0, width: viewportW, height: viewportH }];
  }

  const h = clampRectToViewport(hole, viewportW, viewportH);
  const right = h.left + h.width;
  const bottom = h.top + h.height;

  return [
    { top: 0, left: 0, width: viewportW, height: h.top },
    { top: bottom, left: 0, width: viewportW, height: Math.max(0, viewportH - bottom) },
    { top: h.top, left: 0, width: h.left, height: h.height },
    { top: h.top, left: right, width: Math.max(0, viewportW - right), height: h.height }
  ];
}

type SidePlacement = 'right' | 'left' | 'below' | 'above';

function placementOrder(preferred?: TutorialStep['position']): SidePlacement[] {
  switch (preferred) {
    case 'bottom':
      return ['below', 'right', 'left', 'above'];
    case 'top':
      return ['above', 'right', 'left', 'below'];
    case 'left':
      return ['left', 'right', 'below', 'above'];
    case 'right':
    case 'center':
    default:
      return ['right', 'left', 'below', 'above'];
  }
}

function computePanelStyle(
  hole: ViewportRect | null,
  viewportW: number,
  viewportH: number,
  preferred?: TutorialStep['position'],
  actualPanelH?: number
): Record<string, string> {
  const maxH = `${viewportH - 96}px`;
  const base: Record<string, string> = {
    width: `${PANEL_W}px`,
    maxHeight: maxH,
    display: 'block',
    right: 'auto'
  };

  if (!hole) {
    return {
      ...base,
      position: 'fixed',
      left: `${Math.max(VIEW_EDGE, viewportW - PANEL_W - VIEW_EDGE)}px`,
      top: `${viewportH / 2}px`,
      transform: 'translateY(-50%)'
    };
  }

  const avoid = inflateRect(hole, PANEL_CLEAR_MARGIN);
  const midY = hole.top + hole.height / 2;

  const tryRight = (): Record<string, string> | null => {
    const left = Math.min(
      Math.max(VIEW_EDGE, hole.left + hole.width + PLACE_GAP),
      viewportW - PANEL_W - VIEW_EDGE
    );
    const centerY = Math.max(
      VIEW_EDGE + EST_PANEL_H / 2,
      Math.min(midY, viewportH - VIEW_EDGE - EST_PANEL_H / 2)
    );
    const topPx = centerY - EST_PANEL_H / 2;
    const vb: ViewportRect = { left, top: topPx, width: PANEL_W, height: EST_PANEL_H };
    if (rectsOverlap(vb, avoid)) return null;
    return {
      ...base,
      position: 'fixed',
      left: `${left}px`,
      top: `${centerY}px`,
      transform: 'translateY(-50%)'
    };
  };

  const tryLeftPosition = (): Record<string, string> | null => {
    const left = Math.max(VIEW_EDGE, hole.left - PLACE_GAP - PANEL_W);
    const centerY = Math.max(
      VIEW_EDGE + EST_PANEL_H / 2,
      Math.min(midY, viewportH - VIEW_EDGE - EST_PANEL_H / 2)
    );
    const topPx = centerY - EST_PANEL_H / 2;
    const vb: ViewportRect = { left, top: topPx, width: PANEL_W, height: EST_PANEL_H };
    if (rectsOverlap(vb, avoid)) return null;
    return {
      ...base,
      position: 'fixed',
      left: `${left}px`,
      top: `${centerY}px`,
      transform: 'translateY(-50%)'
    };
  };

  const tryBelow = (): Record<string, string> | null => {
    let left = Math.max(VIEW_EDGE, Math.min(hole.left, viewportW - PANEL_W - VIEW_EDGE));
    let top = hole.top + hole.height + PLACE_GAP;
    top = Math.max(VIEW_EDGE, Math.min(top, viewportH - EST_PANEL_H - VIEW_EDGE));
    const vb: ViewportRect = { left, top, width: PANEL_W, height: EST_PANEL_H };
    if (rectsOverlap(vb, avoid)) return null;
    return {
      ...base,
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      transform: 'none'
    };
  };

  const tryAbove = (): Record<string, string> | null => {
    let left = Math.max(VIEW_EDGE, Math.min(hole.left, viewportW - PANEL_W - VIEW_EDGE));
    let top = hole.top - PLACE_GAP - EST_PANEL_H;
    top = Math.max(VIEW_EDGE, Math.min(top, viewportH - EST_PANEL_H - VIEW_EDGE));
    const vb: ViewportRect = { left, top, width: PANEL_W, height: EST_PANEL_H };
    if (rectsOverlap(vb, avoid)) return null;
    return {
      ...base,
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      transform: 'none'
    };
  };

  const runners: Record<SidePlacement, () => Record<string, string> | null> = {
    right: tryRight,
    left: tryLeftPosition,
    below: tryBelow,
    above: tryAbove
  };

  for (const side of placementOrder(preferred)) {
    const pos = runners[side]();
    if (pos) return pos;
  }

  const hugLeft = Math.min(
    Math.max(VIEW_EDGE, hole.left + hole.width + PLACE_GAP),
    viewportW - PANEL_W - VIEW_EDGE
  );
  const hugTop = Math.max(
    VIEW_EDGE,
    Math.min(midY - EST_PANEL_H / 2, viewportH - EST_PANEL_H - VIEW_EDGE)
  );
  return {
    ...base,
    position: 'fixed',
    left: `${hugLeft}px`,
    top: `${hugTop}px`,
    transform: 'none'
  };
}

export default function TutorialOverlay({
  steps,
  isVisible,
  onClose,
  mode,
  wizardCardRef,
  onLastStepDone,
  onRequestNext,
  onRequestPrev,
  lastStepButtonLabel = 'Done',
  tourGlobalStepNumber,
  tourGlobalStepTotal,
  tutorialStepIndex,
  onTutorialStepIndexChange,
  tutorialRunId = 0,
  projectData
}: TutorialOverlayProps) {
  const safeIndex = steps.length ? Math.min(Math.max(0, tutorialStepIndex), steps.length - 1) : 0;
  const currentStep = steps[safeIndex];
  const hasMultiple = steps.length > 1;
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === steps.length - 1;

  const canAdvance = !currentStep?.requiredField || isRequiredValid(projectData, currentStep.requiredField);

  const [highlight, setHighlight] = useState<ViewportRect | null>(null);
  const [panelStyle, setPanelStyle] = useState<Record<string, string>>({});
  const [spotlightPath, setSpotlightPath] = useState('');
  const [spotlightVb, setSpotlightVb] = useState({ w: 0, h: 0 });
  const [blockerRects, setBlockerRects] = useState<ViewportRect[]>([]);
  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isVisible || !layerRef.current) {
      setHighlight(null);
      setPanelStyle({ display: 'none' });
      setSpotlightPath('');
      setSpotlightVb({ w: 0, h: 0 });
      setBlockerRects([]);
      return;
    }

    let cancelled = false;

    const layout = () => {
      if (cancelled) return;

      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      const card = wizardCardRef?.current;
      const cardR = card ? card.getBoundingClientRect() : null;

      const step = steps[safeIndex];
      let targetEl: Element | null = null;
      if (step?.targetId) {
        targetEl = document.getElementById(step.targetId);
      }

      let highlightRect: ViewportRect | null = null;
      if (targetEl) {
        const tr = targetEl.getBoundingClientRect();
        highlightRect = {
          top: tr.top - SPOTLIGHT_PADDING,
          left: tr.left - SPOTLIGHT_PADDING,
          width: tr.width + SPOTLIGHT_PADDING * 2,
          height: tr.height + SPOTLIGHT_PADDING * 2
        };
      }
      setHighlight(highlightRect);

      const hole = highlightRect || (cardR
        ? { top: cardR.top, left: cardR.left, width: cardR.width, height: cardR.height }
        : null);

      if (mode === 'tour') {
        setSpotlightPath(buildSpotlightPath(viewportW, viewportH, hole));
        setSpotlightVb({ w: viewportW, h: viewportH });
        setBlockerRects(computeBlockerRects(viewportW, viewportH, hole));
      } else {
        setSpotlightPath('');
        setSpotlightVb({ w: 0, h: 0 });
        setBlockerRects([]);
      }

      const actualPanelH = panelRef.current ? panelRef.current.offsetHeight : undefined;
      const panelPos = computePanelStyle(hole, viewportW, viewportH, step?.position, actualPanelH);
      setPanelStyle(panelPos);
    };

    const stepTargetId = steps[safeIndex]?.targetId;

    const resizeObserver = new ResizeObserver(() => layout());
    if (wizardCardRef?.current) resizeObserver.observe(wizardCardRef.current);
    if (stepTargetId) {
      const target = document.getElementById(stepTargetId);
      if (target) resizeObserver.observe(target);
    }
    layout();
    
    const scrollContainer = wizardCardRef?.current ?? null;
    const onScroll = () => layout();
    if (scrollContainer) scrollContainer.addEventListener('scroll', onScroll, { passive: true });

    layout();
    
    const onResize = () => layout();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isVisible, safeIndex, currentStep?.targetId, currentStep?.title, currentStep?.position, wizardCardRef, mode, steps, tutorialRunId]);

  const goNext = () => {
    if (onRequestNext) {
      onRequestNext();
      return;
    }
    if (isLast) {
      if (onLastStepDone) onLastStepDone();
      else onClose();
    } else {
      onTutorialStepIndexChange(safeIndex + 1);
    }
  };

  const goPrev = () => {
    if (onRequestPrev) {
      onRequestPrev();
      return;
    }
    if (!isFirst) onTutorialStepIndexChange(safeIndex - 1);
  };

  if (!isVisible) return null;

  return (
    <div class="tutorial-layer tutorial-layer-viewport" ref={layerRef}>
      {mode === 'tour' && spotlightPath && spotlightVb.w > 0 && (
        <svg
          class="tutorial-spotlight-svg"
          viewBox={`0 0 ${spotlightVb.w} ${spotlightVb.h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path class="tutorial-spotlight-path" d={spotlightPath} />
        </svg>
      )}

      {mode === 'tour' &&
        blockerRects.map((r, idx) => (
          <div
            key={`blocker-${idx}`}
            class="tutorial-click-blocker"
            style={{
              top: `${r.top}px`,
              left: `${r.left}px`,
              width: `${r.width}px`,
              height: `${r.height}px`
            }}
          />
        ))}

      {mode === 'tour' && highlight && (
        <div
          class="tutorial-highlight-ring"
          style={{
            top: `${highlight.top}px`,
            left: `${highlight.left}px`,
            width: `${highlight.width}px`,
            height: `${highlight.height}px`
          }}
        />
      )}

      {currentStep && (
        <div class="tutorial-panel" style={panelStyle} ref={panelRef}>
          <div class="tutorial-panel-header">
            <div class="tutorial-step-indicator">
              {mode === 'tour' &&
              tourGlobalStepNumber != null &&
              tourGlobalStepTotal != null &&
              tourGlobalStepTotal > 0
                ? `Step ${tourGlobalStepNumber} of ${tourGlobalStepTotal}`
                : hasMultiple
                  ? `Step ${safeIndex + 1} of ${steps.length}`
                  : 'Tip'}
            </div>
            <button
              type="button"
              class="tutorial-panel-close"
              onClick={onClose}
              aria-label="Skip tutorial"
              title="Skip tutorial"
            >
              ×
            </button>
          </div>
          <h4 class="tutorial-panel-title">{currentStep.title}</h4>
          <p class="tutorial-panel-text">{currentStep.text}</p>
          {currentStep.requiredField && !canAdvance && (
            <p class="tutorial-required-hint">{currentStep.requiredHint ?? 'Please enter a valid value to continue.'}</p>
          )}
          <div class="tutorial-bubble-actions">
            {hasMultiple && (
              <>
                <button
                  type="button"
                  class="tutorial-btn tutorial-btn-prev"
                  onClick={goPrev}
                  disabled={isFirst}
                >
                  Previous
                </button>
                <button type="button" class="tutorial-btn tutorial-btn-next" onClick={goNext} disabled={!canAdvance}>
                  {isLast ? lastStepButtonLabel : 'Next'}
                </button>
              </>
            )}
            {!hasMultiple &&
              (mode === 'tour' ? (
                <button type="button" class="tutorial-btn tutorial-btn-next" onClick={goNext} disabled={!canAdvance}>
                  {lastStepButtonLabel}
                </button>
              ) : (
                <button
                  type="button"
                  class="tutorial-btn tutorial-btn-next"
                  onClick={onClose}
                  disabled={!canAdvance}
                >
                  Got it
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
