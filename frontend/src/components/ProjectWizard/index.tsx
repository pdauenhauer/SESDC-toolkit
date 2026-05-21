// src/components/ProjectWizard/index.tsx

import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { render } from 'preact';
import '../../css/ProjectWizard.css';

// Import Types and Constants
import { ProjectWizardProps, WizardStep, ProjectData } from './types';
import { INITIAL_PROJECT_DATA } from './constants';

// Import Step Components
import StartStep from './steps/StartStep';
import SolarStep from './steps/SolarStep';
import BatteryStep from './steps/BatteryStep';
import WindStep from './steps/WindStep';
import GeneratorStep from './steps/GeneratorStep';
import LoadsStep from './steps/LoadsStep';
import { TutorialProvider, useTutorial } from './TutorialProvider';

// Import Tutorial Overlay
import TutorialOverlay from './TutorialOverlay';
import {
  TUTORIAL_CONTENT,
  TUTORIAL_TOUR_STEPS,
  getTourTutorialStepTotal
} from './tutorialData';

interface ExtendedWizardProps extends ProjectWizardProps {
  projectName: string;
  initialStep?: WizardStep;
  initialData?: any;
}

function getWizardConfigHeader(step: WizardStep, data: ProjectData): { title: string; cost?: string } | null {
  switch (step) {
    case 'ONBOARDING_PROMPT':
      return { title: 'Success! Project Created.' };
    case 'SOLAR':
      return { title: 'Solar Configuration', cost: `Est. cost: $${data.solar.costs.capital.toLocaleString()}` };
    case 'BATTERY':
      return { title: 'Battery Storage', cost: `Est. cost: $${data.battery.costs.capital.toLocaleString()}` };
    case 'WIND':
      return { title: 'Wind Turbine', cost: `Est. cost: $${data.wind.costs.capital.toLocaleString()}` };
    case 'GENERATOR':
      return { title: 'Diesel Generator', cost: `Est. cost: $${data.generator.costs.capital.toLocaleString()}` };
    default:
      return null;
  }
}

function ProjectWizardBody({ onClose, onFinish, projectName, initialStep, initialData }: ExtendedWizardProps) {
  const tutorial = useTutorial();
  const wizardCardRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<WizardStep>(initialStep ?? 'ONBOARDING_PROMPT');

  const [data, setData] = useState<ProjectData>(() => {
    if (initialData) {
      const init = initialData as Partial<ProjectData>;
      return {
        ...INITIAL_PROJECT_DATA,
        ...init,
        name: projectName,
        solar: { ...INITIAL_PROJECT_DATA.solar, ...init.solar },
        battery: { ...INITIAL_PROJECT_DATA.battery, ...init.battery },
        wind: { ...INITIAL_PROJECT_DATA.wind, ...init.wind },
        generator: { ...INITIAL_PROJECT_DATA.generator, ...init.generator },
        loads:
          Array.isArray(init.loads) && init.loads.length === 24
            ? [...init.loads]
            : [...INITIAL_PROJECT_DATA.loads],
        loadProfiler: {
          baseLoadKw: init.loadProfiler?.baseLoadKw ?? INITIAL_PROJECT_DATA.loadProfiler?.baseLoadKw ?? 0,
          pattern: init.loadProfiler?.pattern,
          buildingSize: init.loadProfiler?.buildingSize
        }
      };
    }
    return {
      ...INITIAL_PROJECT_DATA,
      name: projectName
    };
  });

  useEffect(() => {
    if (projectName) {
      setData((prev) => ({ ...prev, name: projectName }));
    }
  }, [projectName]);

  useEffect(() => {
    if (initialStep) setStep(initialStep);
  }, [initialStep]);

  const [solarAdvancedOpen, setSolarAdvancedOpen] = useState(false);
  const [batteryAdvancedOpen, setBatteryAdvancedOpen] = useState(false);
  const [windAdvancedOpen, setWindAdvancedOpen] = useState(false);
  const [generatorAdvancedOpen, setGeneratorAdvancedOpen] = useState(false);

  const updateSection = (section: keyof ProjectData, field: string, value: any) => {
    setData((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as any), [field]: value }
    }));
  };

  const updateNested = (section: keyof ProjectData, category: string, field: string, value: any) => {
    setData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [category]: {
          ...(prev[section] as any)[category],
          [field]: value
        }
      }
    }));
  };

  const goToStep = useCallback((next: WizardStep) => {
    setStep(next);
    tutorial.bumpTutorialRunId();
  }, [tutorial]);

  const stepToTourIndex = useCallback((wizardStep: WizardStep): number => {
    const idx = TUTORIAL_TOUR_STEPS.findIndex((s) => s.wizardStep === wizardStep);
    return idx >= 0 ? idx : 0;
  }, []);

  const ensureUiForStep = useCallback((index: number) => {
    const next = TUTORIAL_TOUR_STEPS[index];
    if (!next) return;
    if (next.ensureUi === 'solarAdvanced') setSolarAdvancedOpen(true);
    if (next.ensureUi === 'batteryAdvanced') setBatteryAdvancedOpen(true);
    if (next.ensureUi === 'windAdvanced') setWindAdvancedOpen(true);
    if (next.ensureUi === 'generatorAdvanced') setGeneratorAdvancedOpen(true);
  }, []);

  const setTutorialToWizardStep = useCallback((wizardStep: WizardStep) => {
    if (!(tutorial.showTutorial && tutorial.tutorialMode === 'tour')) return;
    const index = stepToTourIndex(wizardStep);
    tutorial.setTutorialOverlayStepIndex(index);
    ensureUiForStep(index);
  }, [ensureUiForStep, stepToTourIndex, tutorial]);

  const handleStepChange = useCallback((next: WizardStep) => {
    goToStep(next);
    setTutorialToWizardStep(next);
  }, [goToStep, setTutorialToWizardStep]);

  const handleTutorialAdvance = useCallback(() => {
    const currentIndex = tutorial.tutorialOverlayStepIndex;
    const nextIndex = currentIndex + 1;
    const nextStep = TUTORIAL_TOUR_STEPS[nextIndex];
    if (!nextStep) {
      tutorial.stopTutorial();
      return;
    }
    ensureUiForStep(nextIndex);
    if (nextStep.wizardStep !== step) {
      goToStep(nextStep.wizardStep);
    }
    tutorial.setTutorialOverlayStepIndex(nextIndex);
    tutorial.bumpTutorialRunId();
  }, [ensureUiForStep, goToStep, step, tutorial]);

  const handleTutorialBack = useCallback(() => {
    const prevIndex = tutorial.tutorialOverlayStepIndex - 1;
    if (prevIndex < 0) return;
    const prevStep = TUTORIAL_TOUR_STEPS[prevIndex];
    if (!prevStep) return;
    ensureUiForStep(prevIndex);
    if (prevStep.wizardStep !== step) {
      goToStep(prevStep.wizardStep);
    }
    tutorial.setTutorialOverlayStepIndex(prevIndex);
    tutorial.bumpTutorialRunId();
  }, [ensureUiForStep, goToStep, step, tutorial]);

  const commonProps = {
    data,
    updateSection,
    updateNested,
    nextStep: handleStepChange
  };

  const startTutorialWithTour = () => {
    setSolarAdvancedOpen(false);
    setBatteryAdvancedOpen(false);
    setWindAdvancedOpen(false);
    setGeneratorAdvancedOpen(false);
    goToStep('SOLAR');
    tutorial.startTour();
    tutorial.setTutorialOverlayStepIndex(0);
    ensureUiForStep(0);
    tutorial.bumpTutorialRunId();
  };

  const isFinalTutorialStage = step === 'LOADS';

  const onTutorialLastStepDone = () => {
    if (tutorial.tutorialMode === 'help') {
      tutorial.stopTutorial();
      return;
    }
    if (tutorial.tutorialMode === 'tour' && isFinalTutorialStage) {
      tutorial.stopTutorial();
    }
  };

  const tourProgressStep =
    tutorial.tutorialMode === 'tour' && TUTORIAL_TOUR_STEPS.some((s) => s.wizardStep === step);
  const tourGlobalStepTotal = tourProgressStep ? getTourTutorialStepTotal() : undefined;
  const tourGlobalStepNumber = tourProgressStep
    ? tutorial.tutorialOverlayStepIndex + 1
    : undefined;

  const lastStepButtonLabel =
    tutorial.tutorialMode === 'help'
      ? 'Got it'
      : isFinalTutorialStage
        ? 'Finish tutorial'
        : 'Continue';

  const headerMeta = getWizardConfigHeader(step, data);

  const tutorialChrome = (
    <div class="wizard-topbar-actions">
      <button type="button" class="help-btn" onClick={tutorial.startHelp} title="Quick help">
        ?
      </button>
      <button type="button" class="tour-btn" onClick={startTutorialWithTour} title="Step-by-step tutorial">
        Tutorial
      </button>
      <button type="button" class="close-btn" onClick={onClose} aria-label="Close wizard">
        &times;
      </button>
    </div>
  );

  const tutorialPortalRef = useRef<HTMLDivElement | null>(null);
  const [tutorialPortalRoot, setTutorialPortalRoot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tutorial.showTutorial) {
      if (!tutorialPortalRef.current) {
        const el = document.createElement('div');
        el.id = 'tutorial-portal-root';
        document.body.appendChild(el);
        tutorialPortalRef.current = el;
        setTutorialPortalRoot(el);
      }
    }
    return () => {
      if (!tutorial.showTutorial && tutorialPortalRef.current) {
        render(null, tutorialPortalRef.current);
        tutorialPortalRef.current.remove();
        tutorialPortalRef.current = null;
        setTutorialPortalRoot(null);
      }
    };
  }, [tutorial.showTutorial]);

  return (
    <div class="wizard-overlay">
      <div class="wizard-card" ref={wizardCardRef}>
        {headerMeta ? (
          <header class="wizard-unified-header">
            <div class="wizard-unified-header-main">
              <h2 class="wizard-step-title">{headerMeta.title}</h2>
              {headerMeta.cost && <p class="wizard-est-cost">{headerMeta.cost}</p>}
            </div>
            {tutorialChrome}
          </header>
        ) : (
          <div class="wizard-topbar wizard-topbar-standalone">
            <div class="wizard-topbar-spacer" aria-hidden="true" />
            {tutorialChrome}
          </div>
        )}

        <div class="wizard-card-body">
          {step === 'ONBOARDING_PROMPT' && (
            <StartStep
              {...commonProps}
              onFinishManually={() => {
                onFinish(data);
                onClose();
              }}
              onStartTutorial={startTutorialWithTour}
            />
          )}

          {step === 'SOLAR' && (
            <SolarStep
              {...commonProps}
              showAdvanced={solarAdvancedOpen}
              setShowAdvanced={setSolarAdvancedOpen}
              onSkip={() => {
                updateSection('solar', 'enabled', false);
                handleStepChange('BATTERY');
              }}
              onBack={() => handleStepChange('ONBOARDING_PROMPT')}
            />
          )}

          {step === 'BATTERY' && (
            <BatteryStep
              {...commonProps}
              showAdvanced={batteryAdvancedOpen}
              setShowAdvanced={setBatteryAdvancedOpen}
              onSkip={() => {
                updateSection('battery', 'enabled', false);
                handleStepChange('WIND');
              }}
              onBack={() => handleStepChange('SOLAR')}
            />
          )}

          {step === 'WIND' && (
            <WindStep
              {...commonProps}
              showAdvanced={windAdvancedOpen}
              setShowAdvanced={setWindAdvancedOpen}
              onSkip={() => {
                updateSection('wind', 'enabled', false);
                handleStepChange('GENERATOR');
              }}
              onBack={() => handleStepChange('BATTERY')}
            />
          )}

          {step === 'GENERATOR' && (
            <GeneratorStep
              {...commonProps}
              showAdvanced={generatorAdvancedOpen}
              setShowAdvanced={setGeneratorAdvancedOpen}
              onSkip={() => {
                updateSection('generator', 'enabled', false);
                handleStepChange('LOADS');
              }}
              onBack={() => handleStepChange('WIND')}
            />
          )}

          {step === 'LOADS' && (
            <LoadsStep
              {...commonProps}
              setData={setData}
              onValidationSync={() => {
                if (tutorial.showTutorial && tutorial.tutorialMode === 'tour'){
                  tutorial.bumpTutorialRunId();
                }
              }}
              onSelectionReady={
                tutorial.showTutorial &&
                tutorial.tutorialMode === 'tour' &&
                tutorial.tutorialOverlayStepIndex === 7
                  ? handleTutorialAdvance
                  : undefined
              }
              onFinish={() => {
                tutorial.stopTutorial();
                onFinish(data);
                onClose();
              }}
              onBack={() => handleStepChange('GENERATOR')}
          />
        )}
        </div>
      </div>
      {tutorial.showTutorial &&
        tutorialPortalRoot &&
        createPortal(
          <TutorialOverlay
            key={`${step}-${tutorial.tutorialMode}-${tutorial.tutorialRunId}`}
            projectData={data as unknown as Record<string, unknown>}
            steps={tutorial.tutorialMode === 'tour' ? TUTORIAL_TOUR_STEPS : (TUTORIAL_CONTENT[step as string] || [])}
            isVisible={tutorial.showTutorial}
            mode={tutorial.tutorialMode}
            onClose={tutorial.stopTutorial}
            wizardCardRef={wizardCardRef}
            onLastStepDone={onTutorialLastStepDone}
            onRequestNext={tutorial.tutorialMode === 'tour' ? handleTutorialAdvance : undefined}
            onRequestPrev={tutorial.tutorialMode === 'tour' ? handleTutorialBack : undefined}
            lastStepButtonLabel={lastStepButtonLabel}
            tourGlobalStepNumber={tourGlobalStepNumber}
            tourGlobalStepTotal={tourGlobalStepTotal}
            tutorialStepIndex={tutorial.tutorialOverlayStepIndex}
            onTutorialStepIndexChange={tutorial.setTutorialOverlayStepIndex}
            tutorialRunId={tutorial.tutorialRunId}
          />,
          tutorialPortalRoot
        )}
    </div>
  );
}

export default function ProjectWizard(props: ExtendedWizardProps) {
  return (
    <TutorialProvider>
      <ProjectWizardBody {...props} />
    </TutorialProvider>
  );
}
