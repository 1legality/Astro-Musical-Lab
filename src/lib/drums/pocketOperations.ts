import drumPatternsData from '../../data/drum_patterns.json';

export const DEFAULT_STEPS = 16;

export interface PocketOperationPattern {
  name: string;
  section: string;
  instruments: Record<string, string>;
  totalSteps?: number;
}

export const GM_DRUM_MAP: Record<string, number> = {
  "BD": 36,
  "SN": 38,
  "CH": 42,
  "OH": 46,
  "LT": 45,
  "MT": 47,
  "HT": 50,
  "CL": 39,
  "SH": 70,
  "RS": 37,
  "CB": 56,
  "CY": 49,
  "HC": 63,
  "AC": 57,
  "LC": 64
};

export const DRUM_SECTION_LABELS: Record<string, string> = {
  "Afro-Cuban": "Afro-Cuban (95-110 BPM)",
  "Basic Patterns": "Basic Patterns (100-120 BPM)",
  "Breaks": "Breaks (125-140 BPM)",
  "Breaks - Kick": "Breaks - Kick (125-140 BPM)",
  "Breaks - Snare": "Breaks - Snare (125-140 BPM)",
  "Drum Rolls": "Drum Rolls (Free/Fill)",
  "Drum and Bass": "Drum and Bass (170-175 BPM)",
  "Dub": "Dub (70-80 BPM)",
  "EDM": "EDM (125-128 BPM)",
  "Electro": "Electro (118-125 BPM)",
  "Funk and Soul": "Funk and Soul (95-110 BPM)",
  "Ghost Snares": "Ghost Snares (85-100 BPM)",
  "Hip Hop": "Hip Hop (85-95 BPM)",
  "House": "House (120-128 BPM)",
  "Hybrid Breaks With Alternate Endings": "Hybrid Breaks (125-140 BPM)",
  "Irregular Breaks": "Irregular Breaks (125-140 BPM)",
  "Miami Bass": "Miami Bass (125-135 BPM)",
  "Pop": "Pop (105-120 BPM)",
  "Reggaeton": "Reggaeton (90-105 BPM)",
  "Rock": "Rock (110-130 BPM)",
  "Rolling Breaks": "Rolling Breaks (125-140 BPM)",
  "Standard Breaks": "Standard Breaks (120-135 BPM)",
  "Uncategorized": "Uncategorized (80-130 BPM)",
  "Tribal": "Tribal (115-125 BPM)",
  // New section defaults (can be updated later)
  "Lo-Fi Hip Hop": "Lo-Fi Hip Hop (70-90 BPM)",
  "Industrial": "Industrial (100-140 BPM)",
  "Synthwave": "Synthwave (80-120 BPM)"
};


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
export const pocketOperationPatterns: PocketOperationPattern[] = (drumPatternsData as any[]).map((data) => {
  // Calculate total steps based on the first instrument's pattern length
  const firstInstrument = Object.values(data.instruments)[0] as string;
  const steps = firstInstrument ? firstInstrument.length : DEFAULT_STEPS;

  return {
    name: data.name,
    section: data.section,
    instruments: data.instruments,
    totalSteps: steps
  };
});

// Define preferred order for known sections
const ORDERED_SECTIONS = [
  "Afro-Cuban",
  "Basic Patterns",
  "Breaks",
  "Breaks - Kick",
  "Breaks - Snare",
  "Drum Rolls",
  "Drum and Bass",
  "Dub",
  "EDM",
  "Electro",
  "Funk and Soul",
  "Ghost Snares",
  "Hip Hop",
  "House",
  "Hybrid Breaks With Alternate Endings",
  "Irregular Breaks",
  "Lo-Fi Hip Hop",
  "Miami Bass",
  "Pop",
  "Reggaeton",
  "Rock",
  "Rolling Breaks",
  "Standard Breaks",
  "Tribal",
  "Industrial",
  "Synthwave",
  "Uncategorized"
];

// Combine ordered sections with any others found in the data
const uniqueSections = Array.from(new Set(pocketOperationPatterns.map(p => p.section)));
export const sectionsInOrder = [
  ...ORDERED_SECTIONS.filter(s => uniqueSections.includes(s)),
  ...uniqueSections.filter(s => !ORDERED_SECTIONS.includes(s)).sort()
];
