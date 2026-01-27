import type { Timestamp } from "firebase/firestore";
import type { BatteryInputs } from "./inputs";

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

  // allow other simulation inputs for future
  [key: string]: unknown;
};
