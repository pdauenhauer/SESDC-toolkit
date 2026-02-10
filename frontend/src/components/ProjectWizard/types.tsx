// src/components/ProjectWizard/types.ts

export type WizardStep = 'NAME' | 'ONBOARDING_PROMPT' | 'SOLAR' | 'BATTERY' | 'WIND' | 'GENERATOR' | 'LOADS';

export interface CostData {
  capital: number;
  opPercent: number;
  opDollar: number;
  repPercent: number;
  repDollar: number;
  fuelPrice?: number; // Optional, only for generator
}

export interface SolarData {
  enabled: boolean;
  sizeKw: number;
  losses: { wire: number; mismatch: number; aging: number; dust: number; converter: number };
  costs: CostData;
  lifespan: number;
}

export interface BatteryData {
  enabled: boolean;
  type: string;
  storageKwh: number;
  chargeKw: number;
  costs: CostData;
  lifespan: number;
}

export interface WindData {
  enabled: boolean;
  nameplateKw: number;
  powerPerTurbineKw: number;
  speeds: { cutIn: number; rated: number; cutOut: number };
  costs: CostData;
  lifespan: number;
}

export interface GeneratorData {
  enabled: boolean;
  capacityKw: number;
  costs: CostData;
  lifespan: number;
}

export interface ProjectData {
  name: string;
  solar: SolarData;
  battery: BatteryData;
  wind: WindData;
  generator: GeneratorData;
  loads: number[];
}

export interface ProjectWizardProps {
  onClose: () => void;
  onFinish: (projectData: ProjectData) => void;
}

// Props that every individual Step Component (e.g. SolarStep.tsx) will receive
export interface StepProps {
  data: ProjectData;
  updateSection: (section: keyof ProjectData, field: string, value: any) => void;
  updateNested: (section: keyof ProjectData, category: string, field: string, value: any) => void;
  nextStep: (next: WizardStep) => void;
  onSkip?: () => void;
}