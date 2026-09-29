import type { LucideIcon } from "lucide-preact";
import {
  BatteryMedium,
  Building,
  Droplet,
  Fan,
  Flame,
  GraduationCap,
  House,
  Laptop,
  Lightbulb,
  Plug,
  Refrigerator,
  Snowflake,
  SolarPanel,
  SquarePlus,
  Tv,
  Wind,
  Zap,
} from "lucide-preact";

/** Default Lucide stroke used across the redesign. */
export const STROKE = 1.75;

/** Load type (labelId from data/loadLabels.ts) → Lucide icon. Replaces the emoji icons. */
export const LOAD_ICONS: Record<string, LucideIcon> = {
  lighting: Lightbulb,
  fridge: Refrigerator,
  tv: Tv,
  fan: Fan,
  pump: Droplet,
  cooker: Flame,
  ac: Snowflake,
  computer: Laptop,
  misc: Plug,
  building: House,
  business: Building,
  school: GraduationCap,
  clinic: SquarePlus,
};

export function loadIcon(labelId: string): LucideIcon {
  return LOAD_ICONS[labelId] ?? Plug;
}

/** Render the icon for a load type at the given size. */
export function LoadIcon({ labelId, size = 16 }: { labelId: string; size?: number }) {
  const Icon = loadIcon(labelId);
  return <Icon size={size} strokeWidth={STROKE} />;
}

export type SourceId = "solar" | "battery" | "wind" | "generator";
export const SOURCE_IDS: SourceId[] = ["solar", "battery", "wind", "generator"];

export type SourceMeta = {
  name: string;
  Icon: LucideIcon;
  /** Icon tile background / foreground. */
  tileBg: string;
  tileFg: string;
  /** Line / dot color used in charts and legends. */
  color: string;
};

export const SOURCE_META: Record<SourceId, SourceMeta> = {
  solar: { name: "Solar", Icon: SolarPanel, tileBg: "#FBF0DC", tileFg: "#A8680F", color: "#E39B2D" },
  battery: { name: "Battery", Icon: BatteryMedium, tileBg: "#EEEBFA", tileFg: "#5B4FB0", color: "#7B6FC4" },
  wind: { name: "Wind", Icon: Wind, tileBg: "#E6EFF8", tileFg: "#356A9E", color: "#4A7FB5" },
  generator: { name: "Generator", Icon: Zap, tileBg: "#F7E6E1", tileFg: "#9A4330", color: "#B4513A" },
};

/** Muted icon-tile colors for a source that is switched off. */
export const SOURCE_OFF = { tileBg: "#F1F0EC", tileFg: "#A3A7AD" };
