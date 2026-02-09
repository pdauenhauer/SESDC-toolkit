// src/components/ProjectWizard/index.tsx

import { useState } from 'preact/hooks';
import './ProjectWizard.css';

// Import Types and Constants
import { ProjectWizardProps, WizardStep, ProjectData } from './types';
import { INITIAL_PROJECT_DATA } from './constants';

// Import Step Components
import NameStep from './steps/NameStep';
import StartStep from './steps/StartStep';
import SolarStep from './steps/SolarStep';
import BatteryStep from './steps/BatteryStep';
import WindStep from './steps/WindStep';
import GeneratorStep from './steps/GeneratorStep';
import LoadsStep from './steps/LoadsStep';

export default function ProjectWizard({ onClose, onFinish }: ProjectWizardProps) {
  const [step, setStep] = useState<WizardStep>('NAME');
  const [data, setData] = useState<ProjectData>(INITIAL_PROJECT_DATA);

  // --- Shared Helper Functions ---

  const updateSection = (section: keyof ProjectData, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [section]: { ...prev[section] as any, [field]: value }
    }));
  };

  const updateNested = (section: keyof ProjectData, category: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [section]: { 
        ...(prev[section] as any)[category], 
        [category]: {
          // @ts-ignore (Handling nested dynamic keys in TS can be tricky, ignore for now)
          ...prev[section][category],
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

  return (
    <div class="wizard-overlay">
      <div class="wizard-card">
        <button class="close-btn" onClick={onClose}>&times;</button>

        {/* Step Components Rendering Based on Current Step */}
        {step === 'NAME' && (
          <NameStep {...commonProps} setData={setData} onClose={onClose} />
        )}

        {step === 'ONBOARDING_PROMPT' && (
           <StartStep {...commonProps} onFinishManually={() => { onFinish(data); onClose(); }} />
        )}

        {step === 'SOLAR' && (
          <SolarStep {...commonProps} onSkip={() => { updateSection('solar', 'enabled', false); setStep('BATTERY'); }} />
        )}

        {step === 'BATTERY' && (
          <BatteryStep {...commonProps} onSkip={() => { updateSection('battery', 'enabled', false); setStep('WIND'); }} />
        )}

        {step === 'WIND' && (
          <WindStep {...commonProps} onSkip={() => { updateSection('wind', 'enabled', false); setStep('GENERATOR'); }} />
        )}

        {step === 'GENERATOR' && (
          <GeneratorStep {...commonProps} onSkip={() => { updateSection('generator', 'enabled', false); setStep('LOADS'); }} />
        )}

        {step === 'LOADS' && (
          <LoadsStep 
             {...commonProps} 
             setData={setData}
             onFinish={() => { onFinish(data); onClose(); }} 
          />
        )}

      </div>
    </div>
  );
}