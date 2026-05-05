// src/components/ProjectWizard/tutorialData.ts
import type { WizardStep } from './types';

export interface TutorialStep {
  id: string;
  wizardStep: WizardStep;
  targetId?: string;
  title: string;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Dot path into project data; user must enter a valid value before advancing (e.g. 'solar.sizeKw', 'battery.type'). */
  requiredField?: string;
  /** UI precondition that should be applied before attaching this step target. */
  ensureUi?: 'solarAdvanced' | 'batteryAdvanced' | 'windAdvanced' | 'generatorAdvanced';
}

export const TUTORIAL_TOUR_STEPS: TutorialStep[] = [
  {
    id: 'tour-solar-1',
    wizardStep: 'SOLAR',
    targetId: 'tutorial-spotlight-solar-step1',
    title: 'Step 1: Solar system size',
    text: 'Choose a preset and enter solar capacity in kW (e.g. 5). This drives generation in the simulation.',
    position: 'right',
    requiredField: 'solar.sizeKw'
  },
  {
    id: 'tour-solar-2',
    wizardStep: 'SOLAR',
    targetId: 'input-solar-losses',
    title: 'Step 2: Solar losses (optional)',
    text: 'Fine Tune is opened automatically when needed. Review losses if needed, then proceed to Battery.',
    position: 'right',
    ensureUi: 'solarAdvanced'
  },
  {
    id: 'tour-battery-1',
    wizardStep: 'BATTERY',
    targetId: 'input-battery-type',
    title: 'Step 3: Battery technology',
    text: 'Pick Lithium-Ion (longer life) or Lead-Acid (lower cost). This sets how much storage costs per kWh.',
    position: 'right',
    requiredField: 'battery.type'
  },
  {
    id: 'tour-battery-2',
    wizardStep: 'BATTERY',
    targetId: 'tutorial-spotlight-battery-step2',
    title: 'Step 4: Battery capacity',
    text: 'Enter storage capacity in kWh (e.g. 10–20). Charge rate (kW) limits speed.',
    position: 'right',
    requiredField: 'battery.storageKwh'
  },
  {
    id: 'tour-wind-1',
    wizardStep: 'WIND',
    targetId: 'input-wind-nameplate',
    title: 'Step 5: Wind (optional)',
    text: "Enter nameplate kW if you're adding wind. You can skip wind and continue without it.",
    position: 'right'
  },
  {
    id: 'tour-wind-2',
    wizardStep: 'WIND',
    targetId: 'input-wind-advanced-fields',
    title: 'Step 6: Wind fine tune (optional)',
    text: 'Fine Tune opens speed and cost controls. Then continue to Generator.',
    position: 'right',
    ensureUi: 'windAdvanced'
  },
  {
    id: 'tour-generator-1',
    wizardStep: 'GENERATOR',
    targetId: 'input-generator-capacity',
    title: 'Step 7: Generator (optional)',
    text: 'Enter backup generator capacity in kW, or skip if not needed.',
    position: 'right'
  },
  {
    id: 'tour-loads-1',
    wizardStep: 'LOADS',
    targetId: 'input-loads-presets',
    title: 'Step 8: Load profile',
    text: 'Pick Residential or Commercial and building size to generate a baseline profile.',
    position: 'right',
    requiredField: 'loadProfiler.selectionReady'
  },
  {
    id: 'tour-loads-2',
    wizardStep: 'LOADS',
    targetId: 'input-loads-manual',
    title: 'Step 9: Manual override and finish',
    text: 'Adjust hourly values in the chart, then create the project to run simulation.',
    position: 'right'
  }
];

export const TUTORIAL_CONTENT: Record<string, TutorialStep[]> = {
  NAME: [],
  ONBOARDING_PROMPT: [
    {
      id: 'help-onboarding-1',
      wizardStep: 'ONBOARDING_PROMPT',
      title: "Project Created",
      text: "Start the Tutorial to configure components in simulation order: Solar, Battery, Wind/Generator, then run.",
      position: 'center'
    }
  ],
  SOLAR: TUTORIAL_TOUR_STEPS.filter((s) => s.wizardStep === 'SOLAR'),
  BATTERY: TUTORIAL_TOUR_STEPS.filter((s) => s.wizardStep === 'BATTERY'),
  WIND: TUTORIAL_TOUR_STEPS.filter((s) => s.wizardStep === 'WIND'),
  GENERATOR: TUTORIAL_TOUR_STEPS.filter((s) => s.wizardStep === 'GENERATOR'),
  LOADS: TUTORIAL_TOUR_STEPS.filter((s) => s.wizardStep === 'LOADS')
};

export function getTourTutorialStepTotal(): number {
  return TUTORIAL_TOUR_STEPS.length;
}

/** 0-based index of the first tutorial card for `wizardStep` within the full tour sequence. */
export function getTourTutorialOffset(wizardStep: string): number {
  const idx = TUTORIAL_TOUR_STEPS.findIndex((s) => s.wizardStep === wizardStep);
  return idx >= 0 ? idx : 0;
}