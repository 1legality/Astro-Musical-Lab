import { parse } from 'yaml';
import rawYaml from '../../content/drum_patterns/pocket_operations_full.yaml?raw';

export const DEFAULT_STEPS = 16;

export interface PocketOperationPattern {
  name: string;
  section: string;
  page?: number;
  instruments: Record<string, number[]>;
  totalSteps: number;
}

interface PocketOperationsFile {
  legend?: Record<string, string>;
  patterns?: Array<{
    name: string;
    section?: string;
    page?: number;
    instruments: Record<string, number[]>;
  }>;
  total_patterns?: number;
}

const normalizeSteps = (steps: number[] | undefined, totalSteps = DEFAULT_STEPS): number[] => {
  if (!Array.isArray(steps)) return [];
  const clamped = steps
    .map((step) => {
      const normalized = Math.round(step);
      if (normalized < 1) return 1;
      if (normalized > totalSteps) return totalSteps;
      return normalized;
    })
    .filter((value) => Number.isFinite(value));
  return Array.from(new Set(clamped)).sort((a, b) => a - b);
};

const parseFile = (): { legend: Record<string, string>; patterns: PocketOperationPattern[]; sectionsInOrder: string[] } => {
  let parsed: PocketOperationsFile | undefined;
  try {
    parsed = parse(rawYaml) as PocketOperationsFile;
  } catch (error) {
    console.error('Unable to parse pocket_operations_full.yaml', error);
  }

  const legend = parsed?.legend ?? {};
  const seenSections = new Set<string>();
  const sectionsInOrder: string[] = [];

  const patterns = (parsed?.patterns ?? []).map((pattern) => {
    const totalSteps = DEFAULT_STEPS;
    const instruments: Record<string, number[]> = {};
    (Object.entries(pattern.instruments || {}) as Array<[string, number[]]>).forEach(([key, values]) => {
      instruments[key] = normalizeSteps(values, totalSteps);
    });
    const section = pattern.section ?? 'Uncategorized';
    if (!seenSections.has(section)) {
      seenSections.add(section);
      sectionsInOrder.push(section);
    }
    return {
      name: pattern.name,
      section,
      page: pattern.page,
      instruments,
      totalSteps,
    };
  });

  return { legend, patterns, sectionsInOrder };
};

const { legend: pocketLegend, patterns: pocketOperationPatterns, sectionsInOrder } = parseFile();

export { pocketLegend, pocketOperationPatterns, sectionsInOrder };
