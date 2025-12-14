import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MidiWriter from 'midi-writer-js';
import {
  pocketLegend,
  pocketOperationPatterns,
  sectionsInOrder,
  GM_DRUM_MAP,
  DEFAULT_STEPS,
  DRUM_SECTION_LABELS,
  type PocketOperationPattern,
} from '../lib/drums/pocketOperations';

import { SynthEngine } from '../lib/SynthEngine';
import { TPQN } from '../lib/chords/MidiGenerator';
import { DrumSampler } from '../lib/drums/drumSampler';
import { RangeControl } from './ui/RangeControl';

// We store velocity (0-127). 0 means no hit.
type StepGrid = Record<string, number[]>;

const DISPLAY_ORDER = ['BD', 'SN', 'RS', 'CL', 'CH', 'OH', 'CY', 'CB', 'LT', 'MT', 'HT', 'SH', 'HC', 'LC', 'AC'];
const SAMPLED_ONLY_INSTRUMENTS = new Set(['LT', 'MT', 'HT']);

const NORMAL_VELOCITY = 110;
const GHOST_VELOCITY = 60;

const parsePatternString = (str: string, totalSteps: number): number[] => {
  const steps = new Array(totalSteps).fill(0);
  for (let i = 0; i < Math.min(str.length, totalSteps); i++) {
    const char = str[i];
    if (char === 'x' || char === 'X') steps[i] = NORMAL_VELOCITY;
    else if (char === 'g' || char === 'G') steps[i] = GHOST_VELOCITY;
    else steps[i] = 0;
  }
  return steps;
};

const buildGrid = (pattern: PocketOperationPattern): { grid: StepGrid; totalSteps: number } => {
  const totalSteps = pattern.totalSteps || DEFAULT_STEPS;
  const grid: StepGrid = {};

  Object.entries(pattern.instruments || {}).forEach(([instrument, patternStr]) => {
    grid[instrument] = parsePatternString(patternStr, totalSteps);
  });

  return { grid, totalSteps };
};

const buildMidiBlob = (midiDataBytes: any): Blob => {
  if (typeof Uint8Array !== 'undefined' && midiDataBytes instanceof Uint8Array) {
    const copy = new Uint8Array(midiDataBytes.length);
    copy.set(midiDataBytes);
    return new Blob([copy], { type: 'audio/midi' });
  }
  if (midiDataBytes && (midiDataBytes instanceof ArrayBuffer || ArrayBuffer.isView(midiDataBytes))) {
    return new Blob([midiDataBytes as any], { type: 'audio/midi' });
  }
  try {
    return new Blob([midiDataBytes as any], { type: 'audio/midi' });
  } catch (error) {
    return new Blob([String(midiDataBytes)], { type: 'text/plain' });
  }
};

const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pattern';

const DEFAULT_PATTERN_NAME = 'ONE AND SEVEN & FIVE AND THIRTEEN';

const DrumPatternSection: React.FC = () => {
  const defaultSection = useMemo(() => {
    const match = pocketOperationPatterns.find((pattern) => pattern.name === DEFAULT_PATTERN_NAME);
    return match?.section ?? sectionsInOrder[0] ?? '';
  }, []);

  const [selectedSection, setSelectedSection] = useState<string>(defaultSection);

  const patterns = useMemo<PocketOperationPattern[]>(
    () => pocketOperationPatterns.filter((pattern: PocketOperationPattern) => pattern.section === selectedSection),
    [selectedSection],
  );

  const initialPatternName = useMemo(() => {
    const defaultPattern = patterns.find((pattern) => pattern.name === DEFAULT_PATTERN_NAME);
    return defaultPattern?.name ?? patterns[0]?.name ?? '';
  }, [patterns]);

  const [selectedName, setSelectedName] = useState<string>(initialPatternName);
  const selectedPattern = useMemo<PocketOperationPattern | undefined>(
    () => patterns.find((pattern: PocketOperationPattern) => pattern.name === selectedName) ?? patterns[0],
    [selectedName, patterns],
  );

  const [grid, setGrid] = useState<StepGrid>({});
  const [totalSteps, setTotalSteps] = useState(DEFAULT_STEPS);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<string>('Select a pattern to preview or export.');
  const [midiChannel, setMidiChannel] = useState<'all' | number>('all');
  const intervalRef = useRef<number | null>(null);
  const synthRef = useRef<SynthEngine | null>(null);
  const samplerRef = useRef<DrumSampler | null>(null);

  useEffect(() => {
    if (patterns.length === 0) {
      setSelectedName('');
      return;
    }
    if (!patterns.find((pattern: PocketOperationPattern) => pattern.name === selectedName)) {
      const fallback = patterns.find((pattern) => pattern.name === DEFAULT_PATTERN_NAME) ?? patterns[0]!;
      setSelectedName(fallback.name);
    }
  }, [patterns, selectedName]);

  useEffect(() => {
    // Reset pattern when section changes to keep selection valid
    if (patterns.length > 0) {
      const preferred = patterns.find((pattern) => pattern.name === DEFAULT_PATTERN_NAME) ?? patterns[0];
      setSelectedName(preferred.name);
    }
  }, [patterns]);

  useEffect(() => {
    if (!selectedPattern) return;
    const next = buildGrid(selectedPattern);
    setGrid(next.grid);
    setTotalSteps(next.totalSteps);
    setCurrentStep(0);
  }, [selectedPattern]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    samplerRef.current = new DrumSampler();
    synthRef.current = new SynthEngine(0.42);
    return () => {
      // Cleanup if needed
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const stepMs = useMemo(() => (60 / Math.max(1, bpm)) * 1000 / 4, [bpm]);

  const visibleInstruments = useMemo(() => {
    if (!selectedPattern) return [];
    // We should show instruments that have ANY notes in the grid, plus basics if empty
    const present = Object.keys(grid);
    if (present.length === 0) return ['BD', 'SN', 'CH']; // Default view if empty

    // Sort by display order
    const ordered = DISPLAY_ORDER.filter((instrument) => present.includes(instrument));
    const extras = present.filter((instrument) => !DISPLAY_ORDER.includes(instrument));
    return [...ordered, ...extras];
  }, [grid, selectedPattern]);

  useEffect(() => {
    samplerRef.current?.preload(visibleInstruments);
  }, [visibleInstruments]);

  const playStep = useCallback(
    (index: number) => {
      const synth = synthRef.current;
      const sampler = samplerRef.current;
      visibleInstruments.forEach((instrument) => {
        const velocities = grid[instrument];
        if (!velocities) return;
        const velocity = velocities[index];
        if (velocity > 0) {
          const note = GM_DRUM_MAP[instrument as keyof typeof GM_DRUM_MAP];
          if (sampler) {
            sampler.play(instrument); // velocity support in sampler? TODO: add volume scaling based on velocity
          } else if (!SAMPLED_ONLY_INSTRUMENTS.has(instrument) && synth && note !== undefined) {
            // Scale volume by velocity (0-127) -> 0-1
            // Synth volume is usually handling gain.
            // For now just playNote.
            synth.playNote(note, 0.08);
          }
        }
      });
    },
    [grid, visibleInstruments],
  );

  useEffect(() => {
    if (!isPlaying || totalSteps <= 0) return;
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    intervalRef.current = window.setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % totalSteps;
        playStep(next);
        return next;
      });
    }, stepMs);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playStep, stepMs, totalSteps]);

  const toggleStep = (instrument: string, index: number) => {
    setGrid((prev) => {
      const current = prev[instrument] ?? Array.from({ length: totalSteps }, () => 0);
      const updated = [...current];
      // Toggle logic: Off -> Normal -> Ghost -> Off
      if (updated[index] === 0) updated[index] = NORMAL_VELOCITY;
      else if (updated[index] === NORMAL_VELOCITY) updated[index] = GHOST_VELOCITY;
      else updated[index] = 0;

      return { ...prev, [instrument]: updated };
    });
  };

  const handlePlayPause = async () => {
    if (!synthRef.current && !samplerRef.current) {
      setStatus('Audio is unavailable in this environment.');
      return;
    }
    const resumers: Array<Promise<void>> = [];
    if (samplerRef.current) resumers.push(samplerRef.current.ensureContextResumed());
    if (synthRef.current) resumers.push(synthRef.current.ensureContextResumed());
    await Promise.all(resumers);
    setIsPlaying((prev) => {
      if (prev) return false;
      playStep(0);
      setCurrentStep(0);
      return true;
    });
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    // synthRef.current?.stopAll();
  };

  const addEarCandy = () => {
    setGrid(prevGrid => {
      const newGrid = { ...prevGrid };
      const instruments = Object.keys(newGrid);
      if (instruments.length === 0) return prevGrid;

      // Simple Ear Candy: Add some random ghost notes to hats or snare
      // Bias towards Hat (CH, OH) and Snare (SN)
      const candidates = instruments.filter(i => ['CH', 'OH', 'SN', 'SH', 'CL'].includes(i));
      const targetInstrument = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : instruments[Math.floor(Math.random() * instruments.length)];

      const track = [...(newGrid[targetInstrument] || [])];

      // Try to find an empty spot on an off-beat (e.g. odd 16th notes)
      const emptyIndices = track.map((v, i) => v === 0 ? i : -1).filter(i => i !== -1);

      if (emptyIndices.length > 0) {
        // Pick random empty spots
        const numAdds = Math.floor(Math.random() * 2) + 1; // Add 1 or 2 hits
        for (let k = 0; k < numAdds; k++) {
          const idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          // Bias towards "ghost" for ear candy
          track[idx] = GHOST_VELOCITY;
        }
        newGrid[targetInstrument] = track;
        setStatus(`Added ear candy to ${targetInstrument}!`);
      } else {
        setStatus('No space for ear candy on ' + targetInstrument);
      }

      return newGrid;
    });
  };

  const resetPattern = () => {
    if (!selectedPattern) return;
    const next = buildGrid(selectedPattern);
    setGrid(next.grid);
    setStatus('Pattern reset to original.');
  };

  const exportMidi = () => {
    if (!selectedPattern) return;
    const track = new MidiWriter.Track();
    track.setTempo(bpm);
    track.setTimeSignature(4, 4, 24, 8);
    const ticksPerStep = Math.max(1, Math.round(TPQN / 4));

    visibleInstruments.forEach((instrument) => {
      const midiNote = GM_DRUM_MAP[instrument as keyof typeof GM_DRUM_MAP];
      if (midiNote === undefined) return;
      const velocities = grid[instrument] ?? [];
      velocities.forEach((vel, index) => {
        if (vel === 0) return;
        const channel = midiChannel === 'all' ? undefined : midiChannel;
        track.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [midiNote],
            tick: index * ticksPerStep,
            duration: 'T' + ticksPerStep,
            velocity: vel,
            ...(channel ? { channel } : {}),
          }),
        );
      });
    });

    const midiData = new MidiWriter.Writer([track]).buildFile();
    const blob = buildMidiBlob(midiData);
    const filename = `${slugify(selectedPattern.name)}-${Math.round(bpm)}bpm.mid`;
    triggerDownload(blob, filename);
    setStatus(`Exported ${filename} (General MIDI, channel 10).`);
  };

  if (!selectedPattern) {
    return (
      <div className="alert alert-warning">
        <span>No patterns found for this section.</span>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200">
      <div className="card-body space-y-4">
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <h3 className="card-title text-xl font-bold leading-tight flex justify-between">
              <span>{selectedPattern.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={resetPattern}
                  className="btn btn-ghost btn-xs text-base-content/50 hover:text-base-content"
                  title="Reset to original pattern"
                >
                  Reset
                </button>
                <button
                  onClick={addEarCandy}
                  className="btn btn-ghost btn-xs text-secondary animate-pulse hover:animate-none"
                  title="Add random ghost notes"
                >
                  ✨ Ear Candy
                </button>
              </div>
            </h3>

            <div className="space-y-3">
              {visibleInstruments.map((instrument) => {
                const velocities = grid[instrument] ?? Array.from({ length: totalSteps }, () => 0);
                const label = pocketLegend[instrument as keyof typeof pocketLegend] ?? instrument;
                return (
                  <div key={instrument} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-base-content/80">
                      <span className="badge badge-outline badge-sm">{instrument}</span>
                      <span>{label}</span>
                    </div>
                    <div className="inline-grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-1 justify-start">
                      {velocities.map((vel, index) => {
                        const isCurrent = isPlaying && currentStep === index;
                        const isActive = vel > 0;
                        const isGhost = vel > 0 && vel < 90;

                        const base = 'btn btn-sm btn-square w-10 h-10 font-semibold transition-colors duration-150';
                        let activeClasses = 'btn-outline btn-neutral text-base-content/60';
                        if (isActive) {
                          activeClasses = isGhost
                            ? 'btn-secondary btn-outline text-secondary-content opacity-70'
                            : 'btn-primary text-primary-content';
                        }

                        const indicator = isCurrent ? 'ring ring-secondary ring-offset-2 ring-offset-base-200' : '';
                        return (
                          <button
                            key={`${instrument}-${index}`}
                            type="button"
                            className={`${base} ${activeClasses} ${indicator}`}
                            onClick={() => toggleStep(instrument, index)}
                            aria-pressed={isActive}
                            aria-label={`Step ${index + 1} for ${instrument} (${isActive ? (isGhost ? 'Ghost' : 'Hit') : 'Off'})`}
                          >
                            {isActive ? (isGhost ? '•' : '●') : index + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button onClick={handlePlayPause} className="btn btn-primary btn-sm">
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button onClick={handleStop} className="btn btn-error btn-sm">
                Stop
              </button>
              <button onClick={exportMidi} className="btn btn-secondary btn-sm">
                Export MIDI (GM)
              </button>
              <div className="badge badge-outline badge-lg font-mono gap-1">
                16th = {(60 / Math.max(1, bpm) / 4).toFixed(3)}s
              </div>
              <div className="text-xs text-base-content/70">{status}</div>
            </div>
          </div>

          <div className="space-y-3 p-1">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm font-medium">Section</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedSection}
                onChange={(event) => setSelectedSection(event.target.value)}
              >
                {sectionsInOrder.map((sectionOption) => (
                  <option key={sectionOption} value={sectionOption}>
                    {DRUM_SECTION_LABELS[sectionOption as keyof typeof DRUM_SECTION_LABELS] || sectionOption}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm font-medium"> Pattern</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedPattern.name}
                onChange={(event) => setSelectedName(event.target.value)}
              >
                {patterns.map((pattern: PocketOperationPattern) => (
                  <option key={pattern.name} value={pattern.name}>
                    {pattern.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm font-medium">MIDI channel</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={midiChannel}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === 'all') setMidiChannel('all');
                    else setMidiChannel(Number(value));
                  }}
                >
                  <option value="all">All channels (omit)</option>
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((channel) => (
                    <option key={channel} value={channel}>
                      Channel {channel}
                    </option>
                  ))}
                </select>
              </div>
              <RangeControl
                label="Tempo"
                value={bpm}
                min={50}
                max={240}
                onChange={setBpm}
                formatValue={(v) => `${v} BPM`}
                className="block w-full"
              />
            </div>
            <div className="text-xs text-base-content/50 opacity-80 mt-4">
              <p>Click pads to cycle: Hit → Ghost → Off</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrumPatternSection;
