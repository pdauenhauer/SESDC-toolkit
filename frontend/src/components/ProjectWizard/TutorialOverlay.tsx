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
  /** Current project data; used to validate requiredField before allowing Next/Done. */
  projectData?: Record<string, unknown>;
}

/** Viewport rect for fixed-position overlay */
interface ViewportRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getValue(data: Record<string, unknown> | undefined, path: string): unknown {
  if (!data) return undefined;
  return path.split('.').reduce((o: unknown, k) => (o != null && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), data);
}

function isRequiredValid(data: Record<string, unknown> | undefined, path: string): boolean {
  const v = getValue(data, path);
  if (path === 'solar.sizeKw' || path === 'battery.storageKwh') return typeof v === 'number' && v > 0;
  if (path === 'battery.type') return v === 'Lithium-Ion' || v === 'Lead-Acid';
  if (path === 'loads') return Array.isArray(v) && v.length === 24 && (v as number[]).some((n) => n > 0);
  return false;
}

export default function TutorialOverlay({
  steps,
  isVisible,
  onClose,
  mode,
  wizardCardRef,
  onLastStepDone,
  projectData
}: TutorialOverlayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<ViewportRect | null>(null);
  const [cardRect, setCardRect] = useState<ViewportRect | null>(null);
  const [panelStyle, setPanelStyle] = useState<Record<string, string>>({});
  const layerRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex];
  const hasMultiple = steps.length > 1;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  const canAdvance = !currentStep?.requiredField || isRequiredValid(projectData, currentStep.requiredField);

  // Reset step index when wizard step (steps array) changes
  useLayoutEffect(() => {
    setCurrentStepIndex(0);
  }, [steps.length, steps[0]?.title]);

  // Position overlay in viewport: dim panels, highlight, and tutorial panel to the right of the wizard card
  useLayoutEffect(() => {
    if (!isVisible || !layerRef.current) {
      setHighlight(null);
      setCardRect(null);
      setPanelStyle({ display: 'none' });
      return;
    }

    const viewportHeight = window.innerHeight;
    const panelWidth = 320;
    const sideGap = 48;
    const padding = 8;

    const card = wizardCardRef?.current;
    const cardR = card ? card.getBoundingClientRect() : null;

    if (cardR) {
      setCardRect({
        top: cardR.top,
        left: cardR.left,
        width: cardR.width,
        height: cardR.height
      });
    } else {
      setCardRect(null);
    }

    // Panel always outside popup: fixed to the right of the viewport with a gap
    setPanelStyle({
      position: 'fixed',
      right: `${sideGap}px`,
      top: '50%',
      transform: 'translateY(-50%)',
      width: `${panelWidth}px`,
      maxHeight: `${viewportHeight - 80}px`,
      display: 'block'
    });

    // Highlight: target element in viewport coords (for dim cutout)
    if (!currentStep) {
      setHighlight(null);
      return;
    }

    let targetEl: Element | null = null;
    if (currentStep.targetId) {
      targetEl = document.getElementById(currentStep.targetId);
    }

    if (targetEl) {
      const tr = targetEl.getBoundingClientRect();
      setHighlight({
        top: tr.top - padding,
        left: tr.left - padding,
        width: tr.width + padding * 2,
        height: tr.height + padding * 2
      });
    } else {
      setHighlight(null);
    }
  }, [isVisible, currentStepIndex, currentStep?.targetId]);

  const goNext = () => {
    if (isLast) {
      if (onLastStepDone) onLastStepDone();
      else onClose();
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    if (!isFirst) setCurrentStepIndex((i) => i - 1);
  };

  // Cutout: either the highlighted target or the whole wizard card (so the form stays clear)
  const cutout = highlight || cardRect;

  if (!isVisible) return null;

  return (
    <div class="tutorial-layer tutorial-layer-viewport" ref={layerRef}>
      {/* Dimmed backdrop in viewport coords; cutout leaves wizard (or target) clear */}
      {mode === 'tour' && (
        <>
          {/* Top */}
          <div
            class="tutorial-dim tutorial-dim-top"
            style={{
              height: cutout ? `${Math.max(0, cutout.top)}px` : '0px'
            }}
            onClick={onClose}
          />
          {/* Bottom */}
          <div
            class="tutorial-dim tutorial-dim-bottom"
            style={
              cutout
                ? {
                    top: `${cutout.top + cutout.height}px`,
                    left: '0',
                    right: '0',
                    height: `${Math.max(0, window.innerHeight - cutout.top - cutout.height)}px`
                  }
                : { display: 'none' }
            }
            onClick={onClose}
          />
          {/* Left */}
          <div
            class="tutorial-dim tutorial-dim-left"
            style={
              cutout
                ? {
                    top: `${cutout.top}px`,
                    left: '0',
                    width: `${cutout.left}px`,
                    height: `${cutout.height}px`
                  }
                : { display: 'none' }
            }
            onClick={onClose}
          />
          {/* Right */}
          <div
            class="tutorial-dim tutorial-dim-right"
            style={
              cutout
                ? {
                    top: `${cutout.top}px`,
                    left: `${cutout.left + cutout.width}px`,
                    width: `${Math.max(0, window.innerWidth - cutout.left - cutout.width)}px`,
                    height: `${cutout.height}px`
                  }
                : { display: 'none' }
            }
            onClick={onClose}
          />
          {/* Highlight ring only when we have a specific target (not the whole card) */}
          {highlight && (
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
        </>
      )}

      {/* Tutorial panel — fixed to the right of the wizard card */}
      {currentStep && (
        <div class="tutorial-panel" style={panelStyle}>
          <div class="tutorial-step-indicator">
            {hasMultiple ? `Step ${currentStepIndex + 1} of ${steps.length}` : 'Tip'}
          </div>
          <h4>{currentStep.title}</h4>
          <p>{currentStep.text}</p>
          {currentStep.requiredField && !canAdvance && (
            <p class="tutorial-required-hint">Please enter a valid value to continue.</p>
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
                <button
                  type="button"
                  class="tutorial-btn tutorial-btn-next"
                  onClick={goNext}
                  disabled={!canAdvance}
                >
                  {isLast ? 'Done' : 'Next'}
                </button>
              </>
            )}
            {!hasMultiple && (
              <button
                type="button"
                class="tutorial-btn tutorial-btn-next"
                onClick={onClose}
                disabled={!canAdvance}
              >
                Got it
              </button>
            )}
          </div>
          <button type="button" class="tutorial-end-btn" onClick={onClose}>
            End tutorial
          </button>
        </div>
      )}

      {mode === 'tour' && (
        <button class="tutorial-close-btn" onClick={onClose}>
          Exit tour
        </button>
      )}
    </div>
  );
}