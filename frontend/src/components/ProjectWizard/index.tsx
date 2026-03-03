// src/components/ProjectWizard/index.tsx

import { useState, useEffect, useRef } from 'preact/hooks';
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

// Import Tutorial Overlay
import TutorialOverlay from './TutorialOverlay';
import { TUTORIAL_CONTENT } from './tutorialData';

interface ExtendedWizardProps extends ProjectWizardProps {
  projectName: string;
  initialStep?: WizardStep;
}

export default function ProjectWizard({ onClose, onFinish, projectName, initialStep }: ExtendedWizardProps) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialMode, setTutorialMode] = useState<'tour' | 'help'>('help');
  const wizardCardRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<WizardStep>(initialStep ?? 'ONBOARDING_PROMPT');
  const [data, setData] = useState<ProjectData>({
    ...INITIAL_PROJECT_DATA,
    name: projectName
  });

  useEffect(() => {
    if(projectName) {
      setData(prev => ({ ...prev, name: projectName }));
    }
  }, [projectName]);

  useEffect(() => {
    if (initialStep) setStep(initialStep);
  }, [initialStep]);

  // --- Shared Helper Functions ---

  const updateSection = (section: keyof ProjectData, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [section]: { ...(prev[section] as any), [field]: value }
    }));
  };

  const updateNested = (section: keyof ProjectData, category: string, field: string, value: any) => {
    setData(prev => ({
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

  // --- Render Orchestration ---

  const commonProps = {
    data,
    updateSection,
    updateNested,
    nextStep: setStep
  };

  const startSmartSetupWithTutorial = () => {
    setStep('SOLAR');
    setShowTutorial(true);
    setTutorialMode('tour');
  };

  /** When user clicks Done on the last tutorial step: close the tutorial and let the user advance the wizard manually. */
  const onTutorialLastStepDone = () => {
    setShowTutorial(false);
  };

  // Portal container so the tutorial mounts in document.body (outside the popup)
  const tutorialPortalRef = useRef<HTMLDivElement | null>(null);
  const [tutorialPortalRoot, setTutorialPortalRoot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (showTutorial) {
      if (!tutorialPortalRef.current) {
        const el = document.createElement('div');
        el.id = 'tutorial-portal-root';
        document.body.appendChild(el);
        tutorialPortalRef.current = el;
        setTutorialPortalRoot(el);
      }
    }
    return () => {
      if (!showTutorial && tutorialPortalRef.current) {
        render(null, tutorialPortalRef.current);
        tutorialPortalRef.current.remove();
        tutorialPortalRef.current = null;
        setTutorialPortalRoot(null);
      }
    };
  }, [showTutorial]);

  return (
    <div class="wizard-overlay">
      <div class="wizard-card" ref={wizardCardRef}>
        {/* Help: quick tips. Tour: step-by-step with dimmed screen */}
        <button
            class="help-btn"
            onClick={() => {
              setTutorialMode('help');
              setShowTutorial(true);
            }}
            title="Quick help"
          >
            ?
        </button>
        <button
            class="tour-btn"
            onClick={() => {
              setTutorialMode('tour');
              setShowTutorial(true);
            }}
            title="Step-by-step tutorial"
          >
            Tour
        </button>

        <button class="close-btn" onClick={onClose}>&times;</button>

        {/* Step Components Rendering Based on Current Step */}

        {step === 'ONBOARDING_PROMPT' && (
           <StartStep
             {...commonProps}
             onFinishManually={() => { onFinish(data); onClose(); }}
             onStartSmartSetup={startSmartSetupWithTutorial}
           />
        )}

        {step === 'SOLAR' && (
          <SolarStep {...commonProps} 
          onSkip={() => { updateSection('solar', 'enabled', false); setStep('BATTERY'); }}
          onBack = {() => setStep('ONBOARDING_PROMPT')}
          />
        )}

        {step === 'BATTERY' && (
          <BatteryStep {...commonProps} 
          onSkip={() => { updateSection('battery', 'enabled', false); setStep('WIND'); }}
          onBack = {() => setStep('SOLAR')}
          />
        )}

        {step === 'WIND' && (
          <WindStep {...commonProps} 
          onSkip={() => { updateSection('wind', 'enabled', false); setStep('GENERATOR'); }}
          onBack = {() => setStep('BATTERY')}
          />
        )}

        {step === 'GENERATOR' && (
          <GeneratorStep {...commonProps} 
          onSkip={() => { updateSection('generator', 'enabled', false); setStep('LOADS'); }}
          onBack = {() => setStep('WIND')}
          />
        )}

        {step === 'LOADS' && (
          <LoadsStep 
             {...commonProps} 
             setData={setData}
             onFinish={() => { onFinish(data); onClose(); }}
             onBack = {() => setStep('GENERATOR')}
          />
        )}

      </div>

      {/* Tutorial rendered outside the popup via portal into document.body */}
      {showTutorial &&
        tutorialPortalRoot &&
        createPortal(
          <TutorialOverlay
            steps={TUTORIAL_CONTENT[step as string] || []}
            isVisible={showTutorial}
            mode={tutorialMode}
            onClose={() => setShowTutorial(false)}
            wizardCardRef={wizardCardRef}
            onLastStepDone={onTutorialLastStepDone}
            projectData={data as unknown as Record<string, unknown>}
          />,
          tutorialPortalRoot
        )}
    </div>
  );
}