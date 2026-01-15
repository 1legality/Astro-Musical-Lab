import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SynthChordPlayer } from '../../lib/chords/SynthChordPlayer';
import { ModulationShape, MODULATION_SHAPE_LABELS, VoicingStyle, VOICING_STYLE_LABELS } from './repeat_types';

type PatternStep = {
  position: number;
  velocityScale: number;
  accent: boolean;
};

type PulsePattern = {
  label: string;
  res: number;
  len: number;
  steps: PatternStep[];
};

type HeldNote = {
  note: number;
  velocity: number;
  order: number;
};

const PATTERNS: PulsePattern[] = [
  {
    label: '8th Notes',
    res: 4,
    len: 16,
    steps: [{ position: 0, velocityScale: 1.0, accent: true }, { position: 8, velocityScale: 0.8, accent: false }],
  },
  {
    label: '16th Notes',
    res: 4,
    len: 4,
    steps: [
      { position: 0, velocityScale: 1.0, accent: true },
      { position: 1, velocityScale: 0.6, accent: false },
      { position: 2, velocityScale: 0.8, accent: false },
      { position: 3, velocityScale: 0.6, accent: false },
    ],
  },
  {
    label: 'Triplets',
    res: 3,
    len: 3,
    steps: [
      { position: 0, velocityScale: 1.0, accent: true },
      { position: 1, velocityScale: 0.7, accent: false },
      { position: 2, velocityScale: 0.7, accent: false },
    ],
  },
  {
    label: '3-3-2 Syncopation',
    res: 4,
    len: 8,
    steps: [
      { position: 0, velocityScale: 1.0, accent: true },
      { position: 3, velocityScale: 0.9, accent: true },
      { position: 6, velocityScale: 0.95, accent: true },
    ],
  },
  {
    label: 'Dotted 8ths',
    res: 4,
    len: 12,
    steps: [
      { position: 0, velocityScale: 1.0, accent: true },
      { position: 3, velocityScale: 0.85, accent: false },
    ],
  },
  {
    label: 'Gallop',
    res: 4,
    len: 4,
    steps: [
      { position: 0, velocityScale: 1.0, accent: true },
      { position: 2, velocityScale: 0.7, accent: false },
      { position: 3, velocityScale: 0.85, accent: false },
    ],
  },
  {
    label: 'Reverse Gallop',
    res: 4,
    len: 4,
    steps: [
      { position: 0, velocityScale: 1.0, accent: true },
      { position: 1, velocityScale: 0.7, accent: false },
      { position: 2, velocityScale: 0.7, accent: false },
    ],
  },
  {
    label: '16th Accent',
    res: 4,
    len: 4,
    steps: [
      { position: 0, velocityScale: 1.0, accent: true },
      { position: 1, velocityScale: 0.4, accent: false },
      { position: 2, velocityScale: 0.5, accent: false },
      { position: 3, velocityScale: 0.4, accent: false },
    ],
  },
  {
    label: 'Off-Beat 8ths',
    res: 4,
    len: 4,
    steps: [{ position: 2, velocityScale: 1.0, accent: true }],
  },
  {
    label: 'Tresillo (3-3-2)',
    res: 4,
    len: 16,
    steps: [
      { position: 0, velocityScale: 1.0, accent: true },
      { position: 3, velocityScale: 0.9, accent: true },
      { position: 6, velocityScale: 0.95, accent: true },
      { position: 8, velocityScale: 1.0, accent: true },
      { position: 11, velocityScale: 0.9, accent: true },
      { position: 14, velocityScale: 0.95, accent: true },
    ],
  },
  {
    label: 'Son Clave 3-2',
    res: 4,
    len: 16,
    steps: [
      { position: 0, velocityScale: 1.0, accent: true },
      { position: 3, velocityScale: 0.9, accent: true },
      { position: 6, velocityScale: 0.95, accent: true },
      { position: 10, velocityScale: 0.9, accent: false },
      { position: 12, velocityScale: 1.0, accent: true },
    ],
  },
  {
    label: 'Action Ostinato',
    res: 4,
    len: 16,
    steps: [
      { position: 0, velocityScale: 1.0, accent: true },
      { position: 3, velocityScale: 0.8, accent: false },
      { position: 6, velocityScale: 0.9, accent: true },
      { position: 9, velocityScale: 0.8, accent: false },
      { position: 12, velocityScale: 1.0, accent: true },
      { position: 14, velocityScale: 0.7, accent: false },
    ],
  },
  {
    label: 'Euclidean 5/16',
    res: 4,
    len: 16,
    steps: [
      { position: 0, velocityScale: 1.0, accent: true },
      { position: 3, velocityScale: 0.8, accent: false },
      { position: 6, velocityScale: 0.9, accent: false },
      { position: 9, velocityScale: 0.8, accent: false },
      { position: 12, velocityScale: 1.0, accent: true },
    ],
  },
];



const VELOCITY_MODES = [
  { id: 1, label: 'As Played' },
  { id: 2, label: 'Fixed' },
  { id: 3, label: 'Accent Pattern' },
  { id: 4, label: 'Ramp Up' },
  { id: 5, label: 'Ramp Down' },
];

const DIVISION_OPTIONS = [
  { label: '1/4x', value: 0.25 },
  { label: '1/2x', value: 0.5 },
  { label: '1x', value: 1.0 },
  { label: '2x', value: 2.0 },
  { label: '4x', value: 4.0 },
];

const REPEAT_TIME_OPTIONS = [
  { label: '1/4x', value: 0.25 },
  { label: '1/2x', value: 0.5 },
  { label: '1x', value: 1.0 },
  { label: '2x', value: 2.0 },
  { label: '4x', value: 4.0 },
];

const NOTE_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CHORD_PRESETS = [
  { label: 'Cmaj', root: 0, intervals: [0, 4, 7] },
  { label: 'Dm', root: 2, intervals: [0, 3, 7] },
  { label: 'Em', root: 4, intervals: [0, 3, 7] },
  { label: 'Fmaj', root: 5, intervals: [0, 4, 7] },
  { label: 'Gmaj', root: 7, intervals: [0, 4, 7] },
  { label: 'Am', root: 9, intervals: [0, 3, 7] },
  { label: 'Bdim', root: 11, intervals: [0, 3, 6] },
];

const GROOVE_TEMPLATES = [
  { id: 0, label: 'None' },
  { id: 1, label: 'Swing 16' },
  { id: 2, label: 'Shuffle' },
  { id: 3, label: 'Dotted' },
  { id: 4, label: 'Sine Wave' },
  { id: 5, label: 'Triangle' },
  { id: 6, label: 'Sawtooth' },
  { id: 7, label: 'Square' },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const formatNoteLabel = (note: number) => `${NOTE_LABELS[note % 12]}${Math.floor(note / 12) - 1}`;

const PulseGeneratorExplorer: React.FC = () => {
  const [patternIndex, setPatternIndex] = useState(0);
  const [harmonyMode, setHarmonyMode] = useState(0); // 0 = Mono (Arp), 1 = Poly (Chord)
  const [humanize, setHumanize] = useState(0);
  const [swing, setSwing] = useState(0);
  const [octaveShift, setOctaveShift] = useState(0);
  const [divisionIndex, setDivisionIndex] = useState(2);
  const [pickup, setPickup] = useState(true);
  const [bpm, setBpm] = useState(120);
  const [inputOctave, setInputOctave] = useState(4);
  const [heldNotes, setHeldNotes] = useState<HeldNote[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // T-1 Parameters
  const [patternLength, setPatternLength] = useState<number | null>(null);
  const [repeatCount, setRepeatCount] = useState(0);
  const [repeatTimeIndex, setRepeatTimeIndex] = useState(2);
  const [repeatPace, setRepeatPace] = useState(0);
  const [repeatOffset, setRepeatOffset] = useState(0);
  const [voicingStyle, setVoicingStyle] = useState(VoicingStyle.Up);
  const [rangeAmount, setRangeAmount] = useState(0);
  const [phraseShape, setPhraseShape] = useState(ModulationShape.Sine);

  // T-1 Velocity & Groove
  const [velocity, setVelocity] = useState(100);
  const [accent, setAccent] = useState(50);
  const [sustain, setSustain] = useState(75);
  const [grooveTemplate, setGrooveTemplate] = useState(0);

  const synthRef = useRef<SynthChordPlayer | null>(null);
  const intervalRef = useRef<number | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const orderRef = useRef(0);
  const arpIndexRef = useRef(1);
  const prevHeldCountRef = useRef(0);
  const stepRef = useRef(0);

  const pattern = PATTERNS[patternIndex] ?? PATTERNS[0];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    synthRef.current = new SynthChordPlayer(0.4);
    return () => {
      synthRef.current?.stopAll();
      synthRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Reset grid position when switching patterns so playback starts at step 1
    stepRef.current = 0;
    setCurrentStep(0);
  }, [patternIndex]);

  const clearScheduled = () => {
    timeoutRefs.current.forEach(timeoutId => window.clearTimeout(timeoutId));
    timeoutRefs.current = [];
  };

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearScheduled();
      setCurrentStep(0);
      stepRef.current = 0;
      synthRef.current?.stopAll();
      return;
    }

    if (typeof window === 'undefined') return;

    const division = DIVISION_OPTIONS[divisionIndex]?.value ?? 1.0;
    const stepMs = (60 / Math.max(1, bpm)) * 1000 / pattern.res / division;

    intervalRef.current = window.setInterval(() => {
      const currentPos = stepRef.current % pattern.len;
      setCurrentStep(currentPos);

      const stepData = pattern.steps.find(step => step.position === currentPos);
      if (stepData && heldNotes.length > 0) {
        const schedulePulse = () => {
          const styledNotes = applyVoicingStyle(heldNotes, voicingStyle);
          const notes = getNotesToPlay(styledNotes, harmonyMode, arpIndexRef);
          playPulse(notes, stepData.velocityScale, stepData.accent, currentPos, pattern.len);
        };

        if (pattern.res === 4 && (currentPos % 2) === 1 && swing > 0) {
          const delayMs = stepMs * (swing / 100) * 0.6;
          const timeoutId = window.setTimeout(schedulePulse, delayMs);
          timeoutRefs.current.push(timeoutId);
        } else {
          schedulePulse();
        }
      }

      stepRef.current += 1;
    }, stepMs);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearScheduled();
    };
    // Restart interval whenever any parameter that affects playback changes so closures stay fresh.
  }, [
    harmonyMode,
    bpm,
    heldNotes,
    humanize,
    isPlaying,
    octaveShift,
    pattern,
    divisionIndex,
    swing,
    repeatCount,
    repeatTimeIndex,
    repeatPace,
    repeatOffset,
    voicingStyle,
    rangeAmount,
    phraseShape,
    velocity,
    accent,
    sustain,
    grooveTemplate,
  ]);

  useEffect(() => {
    if (heldNotes.length === 0) {
      arpIndexRef.current = 1;
    }
  }, [heldNotes]);

  useEffect(() => {
    const wasEmpty = prevHeldCountRef.current === 0;
    if (pickup && wasEmpty && heldNotes.length > 0) {
      const styledNotes = applyVoicingStyle(heldNotes, voicingStyle);
      const notes = getNotesToPlay(styledNotes, harmonyMode, arpIndexRef);
      playPulse(notes, 1.0, true, 0, pattern.len);
    }
    prevHeldCountRef.current = heldNotes.length;
  }, [harmonyMode, heldNotes, pattern.len, pickup, voicingStyle]);

  const playPulse = (
    notesToPlay: HeldNote[],
    velocityScale: number,
    isAccent: boolean,
    patternPos: number,
    patternLen: number,
  ) => {
    if (!synthRef.current || notesToPlay.length === 0) return;

    const division = DIVISION_OPTIONS[divisionIndex]?.value ?? 1.0;
    const stepDurationSeconds = (60 / Math.max(1, bpm)) / pattern.res / division;
    const durationSeconds = stepDurationSeconds * (sustain / 100) * 4;

    const velocities = notesToPlay.map(noteData =>
      calculateVelocity(
        velocity,
        velocityScale,
        isAccent,
        patternPos,
        patternLen,
        accent,
        grooveTemplate,
        humanize,
      ),
    );

    const velocityPeak = velocities.length > 0 ? Math.max(...velocities) : 100;
    const volume = clamp(0.08 + (velocityPeak / 127) * 0.5, 0.05, 0.9);
    synthRef.current.setVolume(volume);

    // Apply phrase modulation to notes
    const phraseModulation = calculatePhraseModulation(
      patternPos,
      patternLen,
      phraseShape,
      rangeAmount
    );

    const shifted = notesToPlay.map(noteData =>
      clamp(noteData.note + (octaveShift * 12) + phraseModulation, 0, 127)
    );

    // Play main pulse
    synthRef.current.playChord(shifted, durationSeconds, velocities);

    // Generate and schedule repeats
    if (repeatCount > 0) {
      const repeatTime = REPEAT_TIME_OPTIONS[repeatTimeIndex]?.value ?? 1.0;
      const stepMs = stepDurationSeconds * 1000;
      const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;

      const repeats = generateRepeats(
        notesToPlay,
        repeatCount,
        repeatTime,
        repeatPace,
        repeatOffset,
        stepMs,
        avgVelocity
      );

      repeats.forEach(repeat => {
        const timeoutId = window.setTimeout(() => {
          if (synthRef.current) {
            const repeatShifted = clamp(repeat.note + (octaveShift * 12) + phraseModulation, 0, 127);
            synthRef.current.playChord([repeatShifted], durationSeconds * 0.7, [repeat.velocity]);
          }
        }, repeat.delayMs);
        timeoutRefs.current.push(timeoutId);
      });
    }
  };

  const toggleNote = (note: number) => {
    synthRef.current?.ensureContextResumed();
    setHeldNotes(prev => {
      const existing = prev.find(entry => entry.note === note);
      if (existing) {
        return prev.filter(entry => entry.note !== note);
      }
      orderRef.current += 1;
      return [...prev, { note, velocity, order: orderRef.current }];
    });
  };

  const setChordPreset = (rootIndex: number, intervals: number[]) => {
    synthRef.current?.ensureContextResumed();
    const baseMidi = (inputOctave + 1) * 12;
    const notes = intervals.map(interval => baseMidi + rootIndex + interval);
    const baseOrder = orderRef.current + 1;
    const next = notes.map((note, index) => ({
      note,
      velocity,
      order: baseOrder + index,
    }));
    orderRef.current = baseOrder + intervals.length - 1;
    setHeldNotes(next);
  };

  const clearNotes = () => {
    setHeldNotes([]);
  };

  const heldNotesDisplay = useMemo(() => {
    return [...heldNotes]
      .sort((a, b) => a.note - b.note)
      .map(note => `${NOTE_LABELS[note.note % 12]}${Math.floor(note.note / 12) - 1}`);
  }, [heldNotes]);

  const velocityPreview = useMemo(() => {
    const values: number[] = Array.from({ length: pattern.len }, () => 0);
    pattern.steps.forEach(step => {
      values[step.position] = calculateVelocity(
        velocity,
        step.velocityScale,
        step.accent,
        step.position,
        pattern.len,
        accent,
        grooveTemplate,
        0, // keep preview stable; ignore humanize randomness
      );
    });
    return values;
  }, [accent, grooveTemplate, velocity, pattern]);

  const velocityChartHeight = 80;
  const velocityChartPadding = 6;
  const velocityChartInnerHeight = velocityChartHeight - velocityChartPadding * 2;
  const velocityChartWidth = useMemo(() => Math.max(1, pattern.len - 1) * 12, [pattern.len]);

  const velocityPolyline = useMemo(() => {
    if (velocityPreview.length === 0) return '';
    return velocityPreview
      .map((val, idx) => {
        const x = (idx / Math.max(1, pattern.len - 1)) * velocityChartWidth;
        const normalized = val / 127;
        const y = velocityChartPadding + (1 - normalized) * velocityChartInnerHeight;
        return `${x},${y}`;
      })
      .join(' ');
  }, [pattern.len, velocityChartInnerHeight, velocityChartPadding, velocityChartWidth, velocityPreview]);

  const playheadProgress = useMemo(
    () => currentStep / Math.max(1, pattern.len - 1),
    [currentStep, pattern.len],
  );
  const playheadPercent = useMemo(
    () => `${playheadProgress * 100}%`,
    [playheadProgress],
  );

  const velocityPlayhead = useMemo(() => {
    if (velocityPreview.length === 0) return null;
    const idx = Math.min(currentStep, velocityPreview.length - 1);
    const val = velocityPreview[idx] ?? 0;
    const x = playheadProgress * velocityChartWidth;
    const normalized = val / 127;
    const y = velocityChartPadding + (1 - normalized) * velocityChartInnerHeight;
    return { x, y };
  }, [
    currentStep,
    playheadProgress,
    velocityChartInnerHeight,
    velocityChartPadding,
    velocityChartWidth,
    velocityPreview,
  ]);

  const arpPreview = useMemo(() => {
    if (heldNotes.length === 0) return [];
    const localIndexRef = { current: 1 };

    const styledNotes = applyVoicingStyle(heldNotes, voicingStyle);

    return Array.from({ length: pattern.len }, () => {
      const notes = getNotesToPlay(styledNotes, harmonyMode, localIndexRef);
      return notes.map(noteData => clamp(noteData.note + (octaveShift * 12), 0, 127));
    });
  }, [harmonyMode, heldNotes, octaveShift, pattern.len, voicingStyle]);

  const arpNoteScale = useMemo(() => {
    if (arpPreview.length === 0) return null;
    const allNotes = arpPreview.reduce((acc, stepNotes) => acc.concat(stepNotes), [] as number[]);
    if (allNotes.length === 0) return null;
    const min = Math.min(...allNotes);
    const max = Math.max(...allNotes);
    const span = max - min;
    return { min, max, span: span === 0 ? 1 : span, isFlat: span === 0 };
  }, [arpPreview]);

  const arpShapeValues = useMemo(() => {
    if (arpPreview.length === 0) return [];
    return arpPreview.map(stepNotes => {
      if (stepNotes.length === 0) return 0;
      const total = stepNotes.reduce((sum, note) => sum + note, 0);
      return total / stepNotes.length;
    });
  }, [arpPreview]);

  const arpChartHeight = 80;
  const arpChartPadding = 6;
  const arpChartInnerHeight = arpChartHeight - arpChartPadding * 2;
  const arpChartWidth = useMemo(() => Math.max(1, pattern.len - 1) * 12, [pattern.len]);

  const arpPolyline = useMemo(() => {
    if (!arpNoteScale || arpShapeValues.length === 0) return '';
    return arpShapeValues
      .map((note, idx) => {
        const x = (idx / Math.max(1, pattern.len - 1)) * arpChartWidth;
        const normalized = arpNoteScale.isFlat ? 0.5 : (note - arpNoteScale.min) / arpNoteScale.span;
        const y = arpChartPadding + (1 - normalized) * arpChartInnerHeight;
        return `${x},${y}`;
      })
      .join(' ');
  }, [arpChartInnerHeight, arpChartPadding, arpChartWidth, arpNoteScale, arpShapeValues, pattern.len]);

  const arpPlayhead = useMemo(() => {
    if (!arpNoteScale || arpShapeValues.length === 0) return null;
    const idx = Math.min(currentStep, arpShapeValues.length - 1);
    const note = arpShapeValues[idx];
    if (note === undefined) return null;
    const x = playheadProgress * arpChartWidth;
    const normalized = arpNoteScale.isFlat ? 0.5 : (note - arpNoteScale.min) / arpNoteScale.span;
    const y = arpChartPadding + (1 - normalized) * arpChartInnerHeight;
    return { x, y };
  }, [
    arpChartInnerHeight,
    arpChartPadding,
    arpChartWidth,
    arpNoteScale,
    arpShapeValues,
    currentStep,
    playheadProgress,
  ]);

  const phraseChartHeight = 80;
  const phraseChartPadding = 6;
  const phraseChartInnerHeight = phraseChartHeight - phraseChartPadding * 2;
  const phraseChartWidth = useMemo(() => Math.max(1, pattern.len - 1) * 12, [pattern.len]);

  const phrasePlayhead = useMemo(() => {
    if (rangeAmount === 0) return null;
    const modulation = calculatePhraseModulation(currentStep, pattern.len, phraseShape, rangeAmount);
    const normalized = (modulation + rangeAmount) / (rangeAmount * 2);
    const x = playheadProgress * phraseChartWidth;
    const y = phraseChartPadding + (1 - normalized) * phraseChartInnerHeight;
    return { x, y };
  }, [
    currentStep,
    pattern.len,
    phraseChartInnerHeight,
    phraseChartPadding,
    phraseChartWidth,
    phraseShape,
    playheadProgress,
    rangeAmount,
  ]);

  const accentSteps = new Set(pattern.steps.filter(step => step.accent).map(step => step.position));
  const ghostSteps = new Set(pattern.steps.filter(step => !step.accent).map(step => step.position));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="card bg-base-200/70">
            <div className="card-body space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    await synthRef.current?.ensureContextResumed();
                    setIsPlaying(prev => !prev);
                  }}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  className="btn btn-error btn-sm"
                  onClick={() => setIsPlaying(false)}
                >
                  Stop
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline px-2"
                    onClick={() => setBpm((b) => Math.max(20, b - 1))}
                  >
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    defaultValue={bpm}
                    key={bpm}
                    onBlur={(e) => {
                      let val = parseInt(e.target.value, 10);
                      if (isNaN(val)) val = 120;
                      setBpm(Math.min(300, Math.max(20, val)));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="input input-bordered input-sm w-16 text-center font-mono"
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline px-2"
                    onClick={() => setBpm((b) => Math.min(300, b + 1))}
                  >
                    +
                  </button>
                  <span className="text-xs text-base-content/70">BPM</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="form-control w-48">
                  <span className="label-text text-xs uppercase tracking-wide">Pattern</span>
                  <select
                    className="select select-bordered select-sm mt-1"
                    value={patternIndex}
                    onChange={event => setPatternIndex(Number(event.target.value))}
                  >
                    {PATTERNS.map((entry, index) => (
                      <option key={entry.label} value={index}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Division</span>
                  <select
                    className="select select-bordered select-sm mt-1"
                    value={divisionIndex}
                    onChange={event => setDivisionIndex(Number(event.target.value))}
                  >
                    {DIVISION_OPTIONS.map((entry, index) => (
                      <option key={entry.label} value={index}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Harmony</span>
                  <select
                    className="select select-bordered select-sm mt-1"
                    value={harmonyMode}
                    onChange={event => setHarmonyMode(Number(event.target.value))}
                  >
                    <option value={0}>Mono (Arp)</option>
                    <option value={1}>Poly (Chord)</option>
                  </select>
                </label>
                <label className="form-control w-48">
                  <span className="label-text text-xs uppercase tracking-wide">Length</span>
                  <input
                    type="range"
                    min={1}
                    max={32}
                    value={patternLength ?? pattern.len}
                    className="range range-xs mt-2"
                    onChange={event => setPatternLength(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">
                    {patternLength ?? pattern.len} steps
                  </span>
                </label>
                <label className="form-control w-32">
                  <span className="label-text text-xs uppercase tracking-wide">Humanize</span>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={humanize}
                    className="range range-xs mt-2"
                    onChange={event => setHumanize(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">{humanize}</span>
                </label>
                <label className="form-control w-32">
                  <span className="label-text text-xs uppercase tracking-wide">Swing</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={swing}
                    className="range range-xs mt-2"
                    onChange={event => setSwing(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">{swing}%</span>
                </label>
                <label className="form-control w-28">
                  <span className="label-text text-xs uppercase tracking-wide">Octave</span>
                  <input
                    type="range"
                    min={-2}
                    max={2}
                    value={octaveShift}
                    className="range range-xs mt-2"
                    onChange={event => setOctaveShift(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">
                    {octaveShift >= 0 ? `+${octaveShift}` : octaveShift}
                  </span>
                </label>
                <label className="form-control w-28">
                  <span className="label-text text-xs uppercase tracking-wide">Pickup</span>
                  <select
                    className="select select-bordered select-sm mt-1"
                    value={pickup ? 'on' : 'off'}
                    onChange={event => setPickup(event.target.value === 'on')}
                  >
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="card bg-base-200/70">
            <div className="card-body space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide mt-0">Pitch Modulation</h3>
              <div className="flex flex-wrap gap-4">
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Voicing Style</span>
                  <select
                    className="select select-bordered select-sm mt-1"
                    value={voicingStyle}
                    onChange={event => setVoicingStyle(Number(event.target.value) as VoicingStyle)}
                  >
                    {VOICING_STYLE_LABELS.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Range</span>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={rangeAmount}
                    className="range range-xs mt-2"
                    onChange={event => setRangeAmount(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">
                    {rangeAmount} semitones
                  </span>
                </label>
                <label className="form-control w-48">
                  <span className="label-text text-xs uppercase tracking-wide">Phrase Shape</span>
                  <select
                    className="select select-bordered select-sm mt-1"
                    value={phraseShape}
                    onChange={event => setPhraseShape(Number(event.target.value) as ModulationShape)}
                  >
                    {MODULATION_SHAPE_LABELS.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="text-xs text-base-content/70">
                Range modulates pitch over the pattern cycle using the selected phrase shape.
              </div>
            </div>
          </div>

          <div className="card bg-base-200/70">
            <div className="card-body space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide mt-0">Repeats</h3>
              <div className="flex flex-wrap gap-4">
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Count</span>
                  <input
                    type="range"
                    min={0}
                    max={16}
                    value={repeatCount}
                    className="range range-xs mt-2"
                    onChange={event => setRepeatCount(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">{repeatCount}</span>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Time</span>
                  <select
                    className="select select-bordered select-sm mt-1"
                    value={repeatTimeIndex}
                    onChange={event => setRepeatTimeIndex(Number(event.target.value))}
                  >
                    {REPEAT_TIME_OPTIONS.map((entry, index) => (
                      <option key={entry.label} value={index}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Pace</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={repeatPace}
                    className="range range-xs mt-2"
                    onChange={event => setRepeatPace(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">
                    {repeatPace > 0 ? `+${repeatPace}` : repeatPace}
                  </span>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Offset</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={repeatOffset}
                    className="range range-xs mt-2"
                    onChange={event => setRepeatOffset(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">
                    {repeatOffset > 0 ? `+${repeatOffset}` : repeatOffset}
                  </span>
                </label>
              </div>
              <div className="text-xs text-base-content/70">
                Pace: bouncing ball effect (+ = accelerate, - = decelerate). Offset: velocity ramp for repeats.
              </div>
            </div>
          </div>

          <div className="card bg-base-200/70">
            <div className="card-body space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide mt-0">Velocity & Groove</h3>
              <div className="flex flex-wrap gap-4">
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Velocity</span>
                  <input
                    type="range"
                    min={1}
                    max={127}
                    value={velocity}
                    className="range range-xs mt-2"
                    onChange={event => setVelocity(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">{velocity}</span>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Accent</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={accent}
                    className="range range-xs mt-2"
                    onChange={event => setAccent(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">{accent}</span>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Sustain</span>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={sustain}
                    className="range range-xs mt-2"
                    onChange={event => setSustain(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">{sustain}%</span>
                </label>
                <label className="form-control w-48">
                  <span className="label-text text-xs uppercase tracking-wide">Groove Template</span>
                  <select
                    className="select select-bordered select-sm mt-1"
                    value={grooveTemplate}
                    onChange={event => setGrooveTemplate(Number(event.target.value))}
                  >
                    {GROOVE_TEMPLATES.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="text-xs text-base-content/70">
                Velocity: base note velocity. Accent: boost for accented steps. Sustain: note length. Groove: velocity modulation pattern.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card bg-base-200/70">
            <div className="card-body space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs uppercase tracking-wide text-base-content/70">Chord Presets</span>
                {CHORD_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => setChordPreset(preset.root, preset.intervals)}
                  >
                    {preset.label}
                  </button>
                ))}
                <button type="button" className="btn btn-xs btn-ghost" onClick={clearNotes}>
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="form-control w-32">
                  <span className="label-text text-xs uppercase tracking-wide">Input Octave</span>
                  <select
                    className="select select-bordered select-sm mt-1"
                    value={inputOctave}
                    onChange={event => setInputOctave(Number(event.target.value))}
                  >
                    {[2, 3, 4, 5, 6].map(octave => (
                      <option key={octave} value={octave}>
                        {octave}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="text-xs text-base-content/70">
                  Held: {heldNotesDisplay.length > 0 ? heldNotesDisplay.join(', ') : 'None'}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {NOTE_LABELS.map((label, index) => {
                  const midiNote = (inputOctave + 1) * 12 + index;
                  const isActive = heldNotes.some(entry => entry.note === midiNote);
                  return (
                    <button
                      key={`${label}-${inputOctave}`}
                      type="button"
                      className={`btn btn-xs ${isActive ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => toggleNote(midiNote)}
                    >
                      {label}{inputOctave}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="card bg-base-200/70">
            <div className="card-body space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide mt-0">Velocity Shape</h3>
              <div className="relative overflow-hidden rounded-xl border border-base-300 bg-base-100/60 p-3">
                <svg viewBox={`0 0 ${velocityChartWidth} ${velocityChartHeight}`} className="w-full h-24">
                  <defs>
                    <linearGradient id="velStroke" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--p))" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="hsl(var(--p))" stopOpacity="0.35" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="100%" height="100%" fill="transparent" stroke="none" />
                  <polyline
                    points={velocityPolyline}
                    fill="none"
                    stroke="url(#velStroke)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {velocityPreview.map((val, idx) => {
                    const x = (idx / Math.max(1, pattern.len - 1)) * velocityChartWidth;
                    const normalized = val / 127;
                    const y = velocityChartPadding + (1 - normalized) * velocityChartInnerHeight;
                    const isAccent = pattern.steps.some(step => step.position === idx && step.accent);
                    const isGhost = pattern.steps.some(step => step.position === idx && !step.accent);
                    const fill = isAccent ? 'hsl(var(--p))' : isGhost ? 'hsl(var(--wa))' : 'hsl(var(--bc))';
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r={isAccent ? 4 : 3}
                        fill={fill}
                        opacity="0.9"
                      />
                    );
                  })}
                  {isPlaying && (
                    <>
                      <line
                        x1={playheadPercent}
                        y1="0"
                        x2={playheadPercent}
                        y2="100%"
                        className="stroke-secondary"
                        strokeWidth="2"
                        opacity="0.8"
                        vectorEffect="non-scaling-stroke"
                      />
                      {velocityPlayhead && (
                        <circle
                          cx={velocityPlayhead.x}
                          cy={velocityPlayhead.y}
                          r={5}
                          className="fill-secondary stroke-secondary"
                          strokeWidth="1"
                          opacity="0.95"
                        />
                      )}
                    </>
                  )}
                </svg>
                <div className="text-xs text-base-content/70 mt-1">
                  Per-step velocity after shaping (accent/ghost/fixed/ramp). Blue = accent, amber = ghost.
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200/70">
            <div className="card-body space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide mt-0">Arp Shape</h3>
              <div className="relative overflow-hidden rounded-xl border border-base-300 bg-base-100/60 p-3">
                {arpPreview.length === 0 || !arpNoteScale ? (
                  <div className="flex h-24 items-center justify-center text-xs text-base-content/60">
                    Hold a chord to preview the arp path.
                  </div>
                ) : (
                  <svg viewBox={`0 0 ${arpChartWidth} ${arpChartHeight}`} className="w-full h-24">
                    <defs>
                      <linearGradient id="arpStroke" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--s))" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="hsl(var(--s))" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                    <polyline
                      points={arpPolyline}
                      fill="none"
                      stroke="url(#arpStroke)"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {arpPreview.map((stepNotes, stepIndex) => {
                      const x = (stepIndex / Math.max(1, pattern.len - 1)) * arpChartWidth;
                      return stepNotes.map((note, noteIndex) => {
                        const normalized = arpNoteScale.isFlat
                          ? 0.5
                          : (note - arpNoteScale.min) / arpNoteScale.span;
                        const y = arpChartPadding + (1 - normalized) * arpChartInnerHeight;
                        const isCurrent = isPlaying && currentStep === stepIndex;
                        const fill = noteIndex === 0 ? 'hsl(var(--s))' : 'hsl(var(--bc))';
                        return (
                          <circle
                            key={`${stepIndex}-${note}-${noteIndex}`}
                            cx={x}
                            cy={y}
                            r={noteIndex === 0 ? 3.5 : 2.5}
                            fill={fill}
                            opacity={noteIndex === 0 ? 0.9 : 0.6}
                            stroke={isCurrent ? 'hsl(var(--a))' : 'none'}
                            strokeWidth={isCurrent ? 1.5 : 0}
                          />
                        );
                      });
                    })}
                    {isPlaying && (
                      <>
                        <line
                          x1={playheadPercent}
                          y1="0"
                          x2={playheadPercent}
                          y2="100%"
                          className="stroke-secondary"
                          strokeWidth="2"
                          opacity="0.8"
                          vectorEffect="non-scaling-stroke"
                        />
                        {arpPlayhead && (
                          <circle
                            cx={arpPlayhead.x}
                            cy={arpPlayhead.y}
                            r={4.5}
                            className="fill-secondary stroke-secondary"
                            strokeWidth="1"
                            opacity="0.9"
                          />
                        )}
                      </>
                    )}
                  </svg>
                )}
                <div className="text-xs text-base-content/70 mt-1">
                  {arpNoteScale
                    ? `One-cycle arp path. Range: ${formatNoteLabel(arpNoteScale.min)}${arpNoteScale.min === arpNoteScale.max ? '' : `-${formatNoteLabel(arpNoteScale.max)}`
                    }.`
                    : 'Arp path updates with held notes and mode.'}
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200/70">
            <div className="card-body space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide mt-0">Phrase Modulation</h3>
              <div className="relative overflow-hidden rounded-xl border border-base-300 bg-base-100/60 p-3">
                {rangeAmount === 0 ? (
                  <div className="flex h-24 items-center justify-center text-xs text-base-content/60">
                    Set Range amount to preview phrase modulation.
                  </div>
                ) : (
                  <svg viewBox={`0 0 ${phraseChartWidth} ${phraseChartHeight}`} className="w-full h-24">
                    <defs>
                      <linearGradient id="phraseStroke" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--a))" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="hsl(var(--a))" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                    <polyline
                      points={Array.from({ length: pattern.len }, (_, idx) => {
                        const x = (idx / Math.max(1, pattern.len - 1)) * phraseChartWidth;
                        const modulation = calculatePhraseModulation(idx, pattern.len, phraseShape, rangeAmount);
                        const normalized = (modulation + rangeAmount) / (rangeAmount * 2);
                        const y = phraseChartPadding + (1 - normalized) * phraseChartInnerHeight;
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="url(#phraseStroke)"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {Array.from({ length: pattern.len }, (_, idx) => {
                      const x = (idx / Math.max(1, pattern.len - 1)) * phraseChartWidth;
                      const modulation = calculatePhraseModulation(idx, pattern.len, phraseShape, rangeAmount);
                      const normalized = (modulation + rangeAmount) / (rangeAmount * 2);
                      const y = phraseChartPadding + (1 - normalized) * phraseChartInnerHeight;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r={3}
                          fill="hsl(var(--a))"
                          opacity="0.9"
                        />
                      );
                    })}
                    {isPlaying && (
                      <>
                        <line
                          x1={playheadPercent}
                          y1="0"
                          x2={playheadPercent}
                          y2="100%"
                          className="stroke-secondary"
                          strokeWidth="2"
                          opacity="0.8"
                          vectorEffect="non-scaling-stroke"
                        />
                        {phrasePlayhead && (
                          <circle
                            cx={phrasePlayhead.x}
                            cy={phrasePlayhead.y}
                            r={4.5}
                            className="fill-secondary stroke-secondary"
                            strokeWidth="1"
                            opacity="0.9"
                          />
                        )}
                      </>
                    )}
                  </svg>
                )}
                <div className="text-xs text-base-content/70 mt-1">
                  {rangeAmount > 0
                    ? `Pitch modulation: ±${rangeAmount} semitones using ${MODULATION_SHAPE_LABELS[phraseShape]} shape.`
                    : 'Phrase modulation visualizes pitch shifts over the pattern cycle.'}
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200/70">
            <div className="card-body space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide mt-0">Pattern Grid</h3>
              <div className="flex justify-center">
                <div className="grid grid-cols-8 gap-2 w-full max-w-[26rem]">
                  {Array.from({ length: pattern.len }).map((_, step) => {
                    const isAccent = accentSteps.has(step);
                    const isGhost = ghostSteps.has(step);
                    const isCurrent = isPlaying && currentStep === step;
                    const baseClasses = 'aspect-square w-full rounded-md border text-xs font-mono flex items-center justify-center';
                    let colorClasses = 'border-base-300 text-base-content/50 bg-base-100/50';
                    if (isGhost) {
                      colorClasses = 'border-warning/60 text-warning bg-warning/10';
                    }
                    if (isAccent) {
                      colorClasses = 'border-primary/70 text-primary bg-primary/10';
                    }
                    const indicator = isCurrent ? 'ring ring-secondary ring-offset-2 ring-offset-base-200' : '';
                    return (
                      <div key={step} className={`${baseClasses} ${colorClasses} ${indicator}`}>
                        {step + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="text-xs text-base-content/70">
                Accent steps are highlighted in blue; ghost hits use amber. Resolution: {pattern.res} per beat.
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

// T-1 Helper Functions

const calculatePhraseModulation = (
  position: number,
  length: number,
  shape: ModulationShape,
  amount: number,
): number => {
  if (amount === 0) return 0;

  const progress = position / Math.max(1, length - 1);
  let modValue = 0;

  switch (shape) {
    case ModulationShape.Sine:
      modValue = Math.sin(progress * Math.PI * 2);
      break;
    case ModulationShape.Triangle:
      modValue = progress < 0.5
        ? progress * 4 - 1
        : 3 - progress * 4;
      break;
    case ModulationShape.Sawtooth:
      modValue = progress * 2 - 1;
      break;
    case ModulationShape.ReverseSaw:
      modValue = 1 - progress * 2;
      break;
    case ModulationShape.Square:
      modValue = progress < 0.5 ? -1 : 1;
      break;
    case ModulationShape.Random:
      modValue = Math.random() * 2 - 1;
      break;
    case ModulationShape.SampleHold:
      modValue = Math.floor(progress * 8) % 2 === 0 ? -1 : 1;
      break;
    case ModulationShape.Exponential:
      modValue = Math.pow(progress, 2) * 2 - 1;
      break;
  }

  return Math.round(modValue * amount);
};

const applyVoicingStyle = (
  notes: HeldNote[],
  style: VoicingStyle,
): HeldNote[] => {
  if (notes.length === 0) return notes;

  let sorted = [...notes];

  switch (style) {
    case VoicingStyle.Up:
      sorted.sort((a, b) => a.note - b.note);
      break;
    case VoicingStyle.Down:
      sorted.sort((a, b) => b.note - a.note);
      break;
    case VoicingStyle.UpDown:
      // A, B, C -> A, B, C, B
      sorted.sort((a, b) => a.note - b.note);
      if (sorted.length > 2) {
        const up = [...sorted];
        const down = sorted.slice(1, -1).reverse();
        sorted = [...up, ...down];
      } else if (sorted.length === 2) {
        // A, B -> A, B (simple up down is just A B? or A B A?)
        // Usually Up-Down on 2 notes is A B. On 3 notes A B C B.
        // Let's keep it simple for 2 notes.
      }
      break;
    case VoicingStyle.Random:
      for (let i = sorted.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      }
      break;
    case VoicingStyle.Converge:
      sorted.sort((a, b) => a.note - b.note);
      const converged: HeldNote[] = [];
      let left = 0;
      let right = sorted.length - 1;
      while (left <= right) {
        if (left === right) {
          converged.push(sorted[left]);
        } else {
          converged.push(sorted[left]);
          converged.push(sorted[right]);
        }
        left += 1;
        right -= 1;
      }
      sorted = converged;
      break;
    case VoicingStyle.Diverge:
      sorted.sort((a, b) => a.note - b.note);
      const diverged: HeldNote[] = [];
      let l = 0;
      let r = sorted.length - 1;
      while (l <= r) {
        if (l === r) {
          diverged.push(sorted[l]);
        } else {
          diverged.push(sorted[l]);
          diverged.push(sorted[r]);
        }
        l += 1;
        r -= 1;
      }
      sorted = diverged.reverse();
      break;
    case VoicingStyle.PinkyAnchor:
      // Lowest note acts as anchor: A, B, C -> A, B, A, C...
      sorted.sort((a, b) => a.note - b.note);
      if (sorted.length > 2) {
        const anchor = sorted[0];
        const rest = sorted.slice(1);
        const result: HeldNote[] = [];
        rest.forEach((note) => {
          result.push(anchor);
          result.push(note);
        });
        sorted = result;
      }
      break;
    case VoicingStyle.AsPlayed:
      sorted.sort((a, b) => a.order - b.order);
      break;
  }

  return sorted;
};

type RepeatNote = {
  note: number;
  velocity: number;
  delayMs: number;
};

const generateRepeats = (
  baseNotes: HeldNote[],
  repeatCount: number,
  repeatTime: number,
  repeatPace: number,
  repeatOffset: number,
  baseStepMs: number,
  baseVelocity: number,
): RepeatNote[] => {
  if (repeatCount === 0 || baseNotes.length === 0) return [];

  const repeats: RepeatNote[] = [];
  const baseDelayMs = baseStepMs * repeatTime;

  for (let i = 1; i <= repeatCount; i++) {
    const progress = i / repeatCount;

    let delayMs = baseDelayMs * i;
    if (repeatPace !== 0) {
      const paceEffect = repeatPace / 100;
      const acceleration = Math.pow(progress, 1 + paceEffect);
      delayMs = baseDelayMs * i * acceleration;
    }

    let velocity = baseVelocity;
    if (repeatOffset !== 0) {
      const offsetEffect = repeatOffset / 100;
      velocity = clamp(
        baseVelocity + (baseVelocity * offsetEffect * progress),
        1,
        127
      );
    }

    baseNotes.forEach(noteData => {
      repeats.push({
        note: noteData.note,
        velocity: Math.round(velocity),
        delayMs,
      });
    });
  }

  return repeats;
};

const getSortedNotes = (notes: HeldNote[], mode: number): HeldNote[] => {
  const sorted = [...notes];
  if (mode === 2) {
    sorted.sort((a, b) => a.note - b.note);
  } else if (mode === 3) {
    sorted.sort((a, b) => b.note - a.note);
  } else if (mode === 4) {
    sorted.sort((a, b) => a.note - b.note);
  } else if (mode === 5) {
    for (let i = sorted.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
  } else if (mode === 6) {
    sorted.sort((a, b) => a.order - b.order);
  }
  return sorted;
};

const getNotesToPlay = (
  voicedNotes: HeldNote[],
  harmonyMode: number, // 0 = Mono, 1 = Poly
  arpIndexRef: React.MutableRefObject<number>,
): HeldNote[] => {
  if (voicedNotes.length === 0) return [];

  // Poly (Chord) Mode: Play all voiced notes together
  if (harmonyMode === 1) {
    return voicedNotes;
  }

  // Mono (Arp) Mode: Cycle through notes
  if (arpIndexRef.current >= voicedNotes.length) {
    arpIndexRef.current = 0;
  }

  const note = voicedNotes[arpIndexRef.current];
  arpIndexRef.current = (arpIndexRef.current + 1) % voicedNotes.length;

  return [note];
};

const calculateVelocity = (
  baseVelocity: number,
  velocityScale: number,
  isAccent: boolean,
  patternPos: number,
  patternLen: number,
  accentAmount: number,
  grooveTemplate: number,
  humanize: number,
): number => {
  let velocity = baseVelocity;

  // Apply pattern step velocity scale
  velocity = Math.floor(velocity * velocityScale);

  // Apply accent
  if (isAccent && accentAmount > 0) {
    velocity += Math.floor((accentAmount / 100) * 40); // Up to +40 velocity for accents
  }

  // Apply groove template modulation
  if (grooveTemplate > 0) {
    const progress = patternPos / Math.max(1, patternLen - 1);
    let grooveMod = 0;

    switch (grooveTemplate) {
      case 1: // Swing 16
        grooveMod = (patternPos % 2) === 1 ? -10 : 0;
        break;
      case 2: // Shuffle
        grooveMod = (patternPos % 3) === 2 ? -15 : 0;
        break;
      case 3: // Dotted
        grooveMod = (patternPos % 3) === 0 ? 10 : -5;
        break;
      case 4: // Sine Wave
        grooveMod = Math.floor(Math.sin(progress * Math.PI * 2) * 15);
        break;
      case 5: // Triangle
        grooveMod = Math.floor((progress < 0.5 ? progress * 4 - 1 : 3 - progress * 4) * 15);
        break;
      case 6: // Sawtooth
        grooveMod = Math.floor((progress * 2 - 1) * 15);
        break;
      case 7: // Square
        grooveMod = progress < 0.5 ? -15 : 15;
        break;
    }
    velocity += grooveMod;
  }

  // Apply humanize
  if (humanize > 0) {
    velocity += Math.floor((Math.random() * (humanize * 2 + 1)) - humanize);
  }

  return clamp(velocity, 1, 127);
};

export default PulseGeneratorExplorer;
