/**
 * Finite list of load labels for the dropdown.
 * Includes common appliances and nestable types (building, business).
 */

export type LoadLabelCategory = "appliance" | "building" | "business";

export type LoadLabel = {
  id: string;
  name: string;
  category: LoadLabelCategory;
  /** If true, this load can contain one level of nested loads (e.g. building → appliances). */
  canNest: boolean;
  /** Icon identifier: emoji string or boxicon class (e.g. "bx bx-building"). */
  icon: string;
};

export const LOAD_LABELS: LoadLabel[] = [
  // Appliances (cannot nest)
  { id: "lighting", name: "Lighting", category: "appliance", canNest: false, icon: "💡" },
  { id: "fridge", name: "Refrigerator", category: "appliance", canNest: false, icon: "🧊" },
  { id: "tv", name: "TV / Electronics", category: "appliance", canNest: false, icon: "📺" },
  { id: "fan", name: "Fan", category: "appliance", canNest: false, icon: "🌀" },
  { id: "pump", name: "Water Pump", category: "appliance", canNest: false, icon: "🚿" },
  { id: "cooker", name: "Cooker / Stove", category: "appliance", canNest: false, icon: "🔥" },
  { id: "ac", name: "Air Conditioning", category: "appliance", canNest: false, icon: "❄️" },
  { id: "computer", name: "Computer", category: "appliance", canNest: false, icon: "💻" },
  { id: "misc", name: "Other Appliance", category: "appliance", canNest: false, icon: "🔌" },
  // Nestable types
  { id: "building", name: "Building", category: "building", canNest: true, icon: "🏠" },
  { id: "business", name: "Business", category: "business", canNest: true, icon: "🏢" },
  { id: "school", name: "School", category: "building", canNest: true, icon: "🏫" },
  { id: "clinic", name: "Clinic / Health", category: "business", canNest: true, icon: "🏥" },
];

export function getLoadLabelById(id: string): LoadLabel | undefined {
  return LOAD_LABELS.find((l) => l.id === id);
}

export function getDefaultLabelId(): string {
  return LOAD_LABELS[0]?.id ?? "lighting";
}
