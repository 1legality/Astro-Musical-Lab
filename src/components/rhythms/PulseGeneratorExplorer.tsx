import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SynthChordPlayer } from '../../lib/chords/SynthChordPlayer';

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

const ARP_MODES = [
  { id: 1, label: 'All Together' },
  { id: 2, label: 'Up' },
  { id: 3, label: 'Down' },
  { id: 4, label: 'Up-Down' },
  { id: 5, label: 'Random' },
  { id: 6, label: 'As Played' },
  { id: 7, label: 'Converge' },
  { id: 8, label: 'Diverge' },
  { id: 9, label: 'Pinky Anchor' },
];

const VELOCITY_MODES = [
  { id: 1, label: 'As Played' },
  { id: 2, label: 'Fixed' },
  { id: 3, label: 'Accent Pattern' },
  { id: 4, label: 'Ramp Up' },
  { id: 5, label: 'Ramp Down' },
];

const RATE_OPTIONS = [
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const PulseGeneratorExplorer: React.FC = () => {
  const [patternIndex, setPatternIndex] = useState(0);
  const [arpMode, setArpMode] = useState(1);
  const [velocityMode, setVelocityMode] = useState(1);
  const [gate, setGate] = useState(50);
  const [inputVelocity, setInputVelocity] = useState(96);
  const [fixedVelocity, setFixedVelocity] = useState(100);
  const [accentVelocity, setAccentVelocity] = useState(120);
  const [ghostVelocity, setGhostVelocity] = useState(60);
  const [humanize, setHumanize] = useState(0);
  const [swing, setSwing] = useState(0);
  const [octaveShift, setOctaveShift] = useState(0);
  const [rateIndex, setRateIndex] = useState(2);
  const [pickup, setPickup] = useState(true);
  const [bpm, setBpm] = useState(120);
  const [inputOctave, setInputOctave] = useState(4);
  const [heldNotes, setHeldNotes] = useState<HeldNote[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const synthRef = useRef<SynthChordPlayer | null>(null);
  const intervalRef = useRef<number | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const orderRef = useRef(0);
  const arpIndexRef = useRef(1);
  const arpDirectionRef = useRef(1);
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

    const rate = RATE_OPTIONS[rateIndex]?.value ?? 1.0;
    const stepMs = (60 / Math.max(1, bpm)) * 1000 / pattern.res / rate;

    intervalRef.current = window.setInterval(() => {
      const currentPos = stepRef.current % pattern.len;
      setCurrentStep(currentPos);

      const stepData = pattern.steps.find(step => step.position === currentPos);
      if (stepData && heldNotes.length > 0) {
        const schedulePulse = () => {
          const notes = getNotesToPlay(heldNotes, arpMode, arpIndexRef, arpDirectionRef);
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
    accentVelocity,
    arpMode,
    bpm,
    fixedVelocity,
    gate,
    ghostVelocity,
    heldNotes,
    humanize,
    isPlaying,
    octaveShift,
    pattern,
    rateIndex,
    swing,
    velocityMode,
  ]);

  useEffect(() => {
    if (heldNotes.length === 0) {
      arpIndexRef.current = 1;
      arpDirectionRef.current = 1;
    }
  }, [heldNotes]);

  useEffect(() => {
    const wasEmpty = prevHeldCountRef.current === 0;
    if (pickup && wasEmpty && heldNotes.length > 0) {
      const notes = getNotesToPlay(heldNotes, arpMode, arpIndexRef, arpDirectionRef);
      playPulse(notes, 1.0, true, 0, pattern.len);
    }
    prevHeldCountRef.current = heldNotes.length;
  }, [arpMode, heldNotes, pattern.len, pickup]);

  const playPulse = (
    notesToPlay: HeldNote[],
    velocityScale: number,
    isAccent: boolean,
    patternPos: number,
    patternLen: number,
  ) => {
    if (!synthRef.current || notesToPlay.length === 0) return;

    const rate = RATE_OPTIONS[rateIndex]?.value ?? 1.0;
    const stepDurationSeconds = (60 / Math.max(1, bpm)) / pattern.res / rate;
    const durationSeconds = stepDurationSeconds * (gate / 100) * 4;

    const velocities = notesToPlay.map(noteData =>
      calculateVelocity(
        noteData.velocity,
        velocityScale,
        isAccent,
        patternPos,
        patternLen,
        velocityMode,
        fixedVelocity,
        accentVelocity,
        ghostVelocity,
        humanize,
      ),
    );

    const velocityPeak = velocities.length > 0 ? Math.max(...velocities) : 100;
    const volume = clamp(0.08 + (velocityPeak / 127) * 0.5, 0.05, 0.9);
    synthRef.current.setVolume(volume);

    const shifted = notesToPlay.map(noteData => clamp(noteData.note + (octaveShift * 12), 0, 127));
    synthRef.current.playChord(shifted, durationSeconds, velocities);
  };

  const toggleNote = (note: number) => {
    synthRef.current?.ensureContextResumed();
    setHeldNotes(prev => {
      const existing = prev.find(entry => entry.note === note);
      if (existing) {
        return prev.filter(entry => entry.note !== note);
      }
      orderRef.current += 1;
      return [...prev, { note, velocity: inputVelocity, order: orderRef.current }];
    });
  };

  const setChordPreset = (rootIndex: number, intervals: number[]) => {
    synthRef.current?.ensureContextResumed();
    const baseMidi = (inputOctave + 1) * 12;
    const notes = intervals.map(interval => baseMidi + rootIndex + interval);
    const baseOrder = orderRef.current + 1;
    const next = notes.map((note, index) => ({
      note,
      velocity: inputVelocity,
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
        inputVelocity,
        step.velocityScale,
        step.accent,
        step.position,
        pattern.len,
        velocityMode,
        fixedVelocity,
        accentVelocity,
        ghostVelocity,
        0, // keep preview stable; ignore humanize randomness
      );
    });
    return values;
  }, [accentVelocity, fixedVelocity, ghostVelocity, inputVelocity, pattern, velocityMode]);

  const velocityChartWidth = useMemo(() => Math.max(1, pattern.len - 1) * 12, [pattern.len]);

  const velocityPolyline = useMemo(() => {
    if (velocityPreview.length === 0) return '';
    return velocityPreview
      .map((val, idx) => {
        const x = (idx / Math.max(1, pattern.len - 1)) * velocityChartWidth;
        const y = 80 - (val / 127) * 80;
        return `${x},${y}`;
      })
      .join(' ');
  }, [pattern.len, velocityChartWidth, velocityPreview]);

  const stepGroups = Math.ceil(pattern.len / 4);
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
                <div className="badge badge-outline badge-lg font-mono">
                  {bpm} BPM
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
                  <span className="label-text text-xs uppercase tracking-wide">Rate</span>
                  <select
                    className="select select-bordered select-sm mt-1"
                    value={rateIndex}
                    onChange={event => setRateIndex(Number(event.target.value))}
                  >
                    {RATE_OPTIONS.map((entry, index) => (
                      <option key={entry.label} value={index}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Arp Mode</span>
                  <select
                    className="select select-bordered select-sm mt-1"
                    value={arpMode}
                    onChange={event => setArpMode(Number(event.target.value))}
                  >
                    {ARP_MODES.map(mode => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Velocity</span>
                  <select
                    className="select select-bordered select-sm mt-1"
                    value={velocityMode}
                    onChange={event => setVelocityMode(Number(event.target.value))}
                  >
                    {VELOCITY_MODES.map(mode => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Gate</span>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={gate}
                    className="range range-xs mt-2"
                    onChange={event => setGate(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">{gate}%</span>
                </label>
                <label className="form-control w-40">
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
                <label className="form-control w-40">
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
                <label className="form-control w-36">
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
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Input Velocity</span>
                  <input
                    type="range"
                    min={1}
                    max={127}
                    value={inputVelocity}
                    className="range range-xs mt-2"
                    onChange={event => setInputVelocity(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">{inputVelocity}</span>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Fixed Vel</span>
                  <input
                    type="range"
                    min={1}
                    max={127}
                    value={fixedVelocity}
                    className="range range-xs mt-2"
                    onChange={event => setFixedVelocity(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">{fixedVelocity}</span>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Accent Vel</span>
                  <input
                    type="range"
                    min={1}
                    max={127}
                    value={accentVelocity}
                    className="range range-xs mt-2"
                    onChange={event => setAccentVelocity(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">{accentVelocity}</span>
                </label>
                <label className="form-control w-40">
                  <span className="label-text text-xs uppercase tracking-wide">Ghost Vel</span>
                  <input
                    type="range"
                    min={1}
                    max={127}
                    value={ghostVelocity}
                    className="range range-xs mt-2"
                    onChange={event => setGhostVelocity(Number(event.target.value))}
                  />
                  <span className="text-xs font-mono text-right text-base-content/70">{ghostVelocity}</span>
                </label>
                <label className="form-control w-32">
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
        </div>

        <div className="space-y-4">
          <div className="card bg-base-200/70">
            <div className="card-body space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide mt-0">Velocity Shape</h3>
              <div className="relative overflow-hidden rounded-xl border border-base-300 bg-base-100/60 p-3">
                <svg viewBox={`0 0 ${velocityChartWidth} 80`} className="w-full h-24">
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
                    const y = 80 - (val / 127) * 80;
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
                </svg>
                <div className="text-xs text-base-content/70 mt-1">
                  Per-step velocity after shaping (accent/ghost/fixed/ramp). Blue = accent, amber = ghost.
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200/70">
            <div className="card-body space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide mt-0">Pattern Grid</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {Array.from({ length: stepGroups }).map((_, groupIndex) => (
                  <div key={groupIndex} className="flex gap-1">
                    {Array.from({ length: 4 }).map((_, stepIndex) => {
                      const step = groupIndex * 4 + stepIndex;
                      if (step >= pattern.len) return null;
                      const isAccent = accentSteps.has(step);
                      const isGhost = ghostSteps.has(step);
                      const isCurrent = isPlaying && currentStep === step;
                      const baseClasses = 'w-8 h-8 rounded-md border text-xs font-mono flex items-center justify-center';
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
                ))}
              </div>
              <div className="text-xs text-base-content/70">
                Accent steps are highlighted in blue; ghost hits use amber. Resolution: {pattern.res} per beat.
              </div>
            </div>
          </div>

          <div className="card bg-base-200/70">
            <div className="card-body space-y-2 text-sm text-base-content/70">
              <p>
                Load a chord, press play, and tweak rate, gate, swing, and velocity shaping to audition pulse feels.
                Arp modes follow the same ordering as your Falcon script.
              </p>
              <p>
                Tip: Try Pinky Anchor with a low octave shift for cinematic ostinatos, or switch to Accent Pattern
                mode to hear the built-in groove in each template.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  heldNotes: HeldNote[],
  arpMode: number,
  arpIndexRef: React.MutableRefObject<number>,
  arpDirectionRef: React.MutableRefObject<number>,
): HeldNote[] => {
  if (heldNotes.length === 0) return [];

  const sorted = getSortedNotes(heldNotes, arpMode);

  if (arpMode === 9) {
    if (sorted.length < 2) {
      return [sorted[0]];
    }
    const anchor = sorted[0];
    const rest = sorted.slice(1).sort((a, b) => a.note - b.note);
    const restIndex = ((arpIndexRef.current - 1) % rest.length);
    arpIndexRef.current += 1;
    return [anchor, rest[restIndex]];
  }

  if (arpMode === 1) {
    return sorted;
  }

  let pool = [...sorted];
  if (arpMode === 7 || arpMode === 8) {
    pool.sort((a, b) => a.note - b.note);
    const converged: HeldNote[] = [];
    let left = 0;
    let right = pool.length - 1;
    while (left <= right) {
      if (left === right) {
        converged.push(pool[left]);
      } else {
        converged.push(pool[left]);
        converged.push(pool[right]);
      }
      left += 1;
      right -= 1;
    }
    pool = arpMode === 8 ? converged.reverse() : converged;
  }

  if (arpIndexRef.current > pool.length) {
    arpIndexRef.current = 1;
  }
  if (arpIndexRef.current < 1) {
    arpIndexRef.current = pool.length;
  }

  const result = [pool[arpIndexRef.current - 1]];

  if (arpMode === 4) {
    arpIndexRef.current += arpDirectionRef.current;
    if (arpIndexRef.current > sorted.length) {
      arpDirectionRef.current = -1;
      arpIndexRef.current = Math.max(1, sorted.length - 1);
    } else if (arpIndexRef.current < 1) {
      arpDirectionRef.current = 1;
      arpIndexRef.current = Math.min(sorted.length, 2);
    }
  } else {
    arpIndexRef.current += 1;
    if (arpIndexRef.current > pool.length) {
      arpIndexRef.current = 1;
    }
  }

  return result;
};

const calculateVelocity = (
  baseVelocity: number,
  velocityScale: number,
  isAccent: boolean,
  patternPos: number,
  patternLen: number,
  velocityMode: number,
  fixedVelocity: number,
  accentVelocity: number,
  ghostVelocity: number,
  humanize: number,
): number => {
  let velocity = baseVelocity;

  if (velocityMode === 2) {
    velocity = fixedVelocity;
  } else if (velocityMode === 3) {
    velocity = isAccent ? accentVelocity : ghostVelocity;
  } else if (velocityMode === 4) {
    const progress = patternPos / Math.max(1, patternLen - 1);
    velocity = 40 + (progress * 87);
  } else if (velocityMode === 5) {
    const progress = patternPos / Math.max(1, patternLen - 1);
    velocity = 127 - (progress * 87);
  } else {
    velocity = Math.floor(velocity * velocityScale);
  }

  if (humanize > 0) {
    velocity += Math.floor((Math.random() * (humanize * 2 + 1)) - humanize);
  }

  return clamp(velocity, 1, 127);
};

export default PulseGeneratorExplorer;
