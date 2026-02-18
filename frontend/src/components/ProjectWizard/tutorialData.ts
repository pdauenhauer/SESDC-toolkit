// src/components/ProjectWizard/tutorialData.ts

export interface TutorialStep {
  targetId?: string;
  title: string;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Dot path into project data; user must enter a valid value before advancing (e.g. 'solar.sizeKw', 'battery.type'). */
  requiredField?: string;
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
        title: 'Step 1: Enter system size',
        text: 'Enter your solar array capacity in kW (e.g. 5 for a small home). This drives energy production in the simulation.',
        position: 'right',
        requiredField: 'solar.sizeKw'
    },
    {
        targetId: 'input-solar-losses',
        title: 'Step 2: Losses (optional)',
        text: 'Open "Fine Tune" to set efficiency losses if needed. 14% total is a common default. Then click "Next: Battery" below.',
        position: 'right'
    }
  ],
  BATTERY: [
    {
        targetId: 'input-battery-type',
        title: 'Step 1: Choose battery type',
        text: 'Pick Lithium-Ion (longer life) or Lead-Acid (lower cost). This sets how much storage costs per kWh.',
        position: 'right',
        requiredField: 'battery.type'
    },
    {
        targetId: 'input-battery-capacity',
        title: 'Step 2: Set capacity',
        text: 'Enter storage capacity in kWh (e.g. 10–20 for a small system). Charge rate (kW) limits how fast the battery can charge. Then click "Next: Wind" below.',
        position: 'right',
        requiredField: 'battery.storageKwh'
    }
  ],
  WIND: [
    {
        targetId: 'input-wind-nameplate',
        title: 'Step 1: Wind nameplate (optional)',
        text: "Enter nameplate kW if you're adding wind. You can skip this step with \"Skip Wind\" to continue without wind.",
        position: 'right'
    },
    {
        targetId: 'input-wind-advanced',
        title: 'Step 2: Fine tune (optional)',
        text: 'Open "Fine Tune" to set cut-in, rated, and cut-out speeds (m/s) to match your turbine. Then click "Next: Generator".',
        position: 'right'
    }
  ],
  GENERATOR: [
    {
        targetId: 'input-generator-capacity',
        title: 'Step 1: Generator capacity (optional)',
        text: 'Enter backup generator capacity in kW. Skip with "Skip" if you don’t need a generator, or use "Fine Tune" for fuel price. Then click "Next: Loads".',
        position: 'right'
    }
  ],
  LOADS: [
    {
        targetId: 'input-loads-presets',
        title: 'Step 1: Choose load pattern',
        text: 'Pick Residential (evening peak) or Commercial (daytime peak). You’ll be prompted for peak load in kW—this defines hourly demand for the simulation.',
        position: 'right',
        requiredField: 'loads'
    },
    {
        targetId: 'input-loads-manual',
        title: 'Step 2: Adjust hourly (optional)',
        text: 'Edit individual hours if needed. When ready, click "Create Project" to finish and run your simulation.',
        position: 'right'
    }
  ]
};