export type LoadBlock = {
  id: string;
  label: string;
  startHour: number;
  endHour: number; // 1-24; 24 means wraps to midnight
  valueKw: number;
};

export function hoursInRange(startHour: number, endHour: number): number[] {
  const all = Array.from({ length: 24 }, (_, h) => h);
  if (startHour === endHour) return all;
  if (startHour < endHour) return all.filter((h) => h >= startHour && h < endHour);
  return all.filter((h) => h >= startHour || h < endHour);
}

export function computeProfile(blocks: LoadBlock[], baseKw = 0): number[] {
  const profile = Array.from({ length: 24 }, () => baseKw);
  for (const block of blocks) {
    const clamped = Math.max(baseKw, Math.round(block.valueKw * 100) / 100);
    for (const h of hoursInRange(block.startHour, block.endHour)) {
      profile[h] = Math.max(profile[h], clamped);
    }
  }
  return profile;
}

export function makeBlockId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function defaultBlocks(): LoadBlock[] {
  return [
    { id: makeBlockId(), label: 'Morning',   startHour: 6,  endHour: 12, valueKw: 0 },
    { id: makeBlockId(), label: 'Afternoon', startHour: 12, endHour: 18, valueKw: 0 },
    { id: makeBlockId(), label: 'Evening',   startHour: 18, endHour: 24, valueKw: 0 },
    { id: makeBlockId(), label: 'Night',     startHour: 0,  endHour: 6,  valueKw: 0 },
  ];
}