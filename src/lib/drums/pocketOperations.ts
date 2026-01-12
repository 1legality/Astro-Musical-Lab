import drumPatterns from '../../data/drum_patterns.json';

export const DEFAULT_STEPS = 16;

export interface PocketOperationPattern {
  name: string;
  section: string;
  instruments: Record<string, string>; // now string patterns like "x...x..."
  totalSteps: number;
}

const {
  GM_DRUM_MAP,
  DRUM_SECTIONS,
  DRUM_SECTION_LABELS,
  DRUM_PATTERN_TEMPLATES
} = drumPatterns;

export const pocketLegend = {
  // Basic inferred legend
  "BD": "Bass Drum",
  "SN": "Snare",
  "CH": "Closed Hat",
  "OH": "Open Hat",
  "CL": "Clap",
  "RS": "Rim Shot",
  "CB": "Cowbell",
  "CY": "Cymbal",
  "LT": "Low Tom",
  "MT": "Mid Tom",
  "HT": "High Tom",
  "SH": "Shaker",
  "HC": "High Conga",
  "LC": "Low Conga",
  "AC": "Accented Conga"
};

// Flatten the template map to an array
export const pocketOperationPatterns: PocketOperationPattern[] = Object.entries(DRUM_PATTERN_TEMPLATES).map(([name, data]: [string, any]) => {
  return {
    name: name,
    section: data.section,
    instruments: data.instruments,
    totalSteps: 16 // Default for now, could be inferred from string length
  };
});

export const sectionsInOrder = DRUM_SECTIONS;
export { GM_DRUM_MAP, DRUM_SECTION_LABELS };
