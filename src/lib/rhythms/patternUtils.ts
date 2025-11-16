export const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const generateEvenSteps = (pulses: number, totalSteps: number) => {
  const safeTotal = Math.max(1, totalSteps);
  const safePulses = clampValue(Math.floor(pulses), 0, safeTotal);

  if (safePulses === 0) return [];
  if (safePulses === safeTotal) {
    return Array.from({ length: safeTotal }, (_, idx) => idx + 1);
  }

  const hits: number[] = [];
  let bucket = safeTotal - safePulses;

  for (let step = 0; step < safeTotal; step += 1) {
    bucket += safePulses;
    if (bucket >= safeTotal) {
      bucket -= safeTotal;
      hits.push(step + 1);
    }
  }

  return hits;
};

export const rotateSteps = (steps: number[], rotation: number, totalSteps: number) => {
  const safeTotal = Math.max(1, totalSteps);
  const normalizedRotation = ((rotation % safeTotal) + safeTotal) % safeTotal;
  return steps
    .map(step => {
      const base = ((step - 1 + normalizedRotation) % safeTotal + safeTotal) % safeTotal;
      return base + 1;
    })
    .sort((a, b) => a - b);
};

export const buildMeterAnchors = (length: number, totalSteps: number) => {
  const safeLength = Math.max(1, Math.floor(length));
  const safeTotal = Math.max(1, totalSteps);
  const anchors: number[] = [];

  for (let pos = 1; pos <= safeTotal; pos += safeLength) {
    anchors.push(pos);
  }

  return anchors;
};
