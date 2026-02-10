// src/components/ProjectWizard/tutorialData.ts

export interface TutorialStep {
  targetId?: string; 
  title: string;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const TUTORIAL_CONTENT: Record<string, TutorialStep[]> = {
  NAME: [
    { 
      title: "Project Identity", 
      text: "Give your project a unique name to identify it later in your dashboard.",
      position: 'center' 
    }
  ],
  ONBOARDING_PROMPT: [
    {
      title: "Smart Setup",
      text: "You can choose to let us guide you component-by-component, or skip straight to the workbench.",
      position: 'center'
    }
  ],
  SOLAR: [
    { 
        targetId: 'input-solar-size', 
        title: 'System Size', 
        text: 'This is the total capacity of your solar array. Start with 5kW for a small home.',
        position: 'top'
    },
    { 
        targetId: 'input-solar-losses', 
        title: 'Efficiency Losses', 
        text: 'Real world factors like dust and wiring reduce output. 14% is a standard industry average.',
        position: 'bottom' 
    }
  ],
  BATTERY: [
    {
        title: "Battery Tech",
        text: "Select a battery type. Lithium-Ion lasts longer; Lead-Acid is cheaper upfront.",
        position: 'top'
    }
  ],
  WIND: [
    {
        title: "Wind Speed",
        text: "Make sure your 'Cut-in' speed matches your turbine specs. This is the wind speed needed to start spinning.",
        position: 'top'
    }
  ],
  GENERATOR: [
    {
        title: "Backup Power",
        text: "Generators provide reliability when renewable sources are low.",
        position: 'top'
    }
  ],
  LOADS: [
    {
        title: "Usage Patterns",
        text: "Defining how energy is used (Morning vs Evening) helps calculate battery needs more accurately.",
        position: 'center'
    }
  ]
};