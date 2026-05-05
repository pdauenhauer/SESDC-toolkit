import type { Timestamp } from "firebase/firestore";
import type { BatteryInputs } from "./inputs";
import type {
  SolarData,
  BatteryData,
  WindData,
  GeneratorData,
  LoadProfilerSettings,
} from "../../components/ProjectWizard/types";
import type { Load } from "./load";

export type User = {
  id: string;
  email: string;
  username: string;
  projectids?: string[];
};

export type Project = {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  addedLocationData?: boolean;
  batteryInputs?: BatteryInputs;

  /** Unified wizard / simulation configuration (same shape as manual + tutorial completion). */
  solar?: SolarData;
  battery?: BatteryData;
  wind?: WindData;
  generator?: GeneratorData;
  /** Workbench load tree; typically one “Site demand” root with a 24 h profile in kW. */
  loads?: Load[];
  loadProfiler?: LoadProfilerSettings;

  /**
   * @deprecated Prefer root-level `solar`, `battery`, `loads`, etc. Kept for reading legacy docs.
   */
  wizardConfig?: unknown;

  // allow other simulation inputs for future
  [key: string]: unknown;
};
