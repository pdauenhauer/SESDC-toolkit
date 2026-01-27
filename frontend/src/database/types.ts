import type { Timestamp } from "firebase/firestore";

export type UserDoc = {
  email: string;
  username: string;
  numprojects?: number;
  projectids?: string[];
};

export type BatteryInputs = {
  batteryType: string;
  capex: number;
  chargeCapacity: number;
  lifespan: number;
  maximumStorage: number;
  opex: number;
  replacement: number;
  usingBattery: boolean;
};

export type ProjectConfigDoc = {
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  addedLocationData?: boolean;
  batteryInputs?: BatteryInputs;

  // allow other simulation inputs for future
  [key: string]: unknown;
};
