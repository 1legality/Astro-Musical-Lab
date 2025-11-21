import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MidiWriter from 'midi-writer-js';
import { pocketLegend, pocketOperationPatterns, DEFAULT_STEPS, type PocketOperationPattern } from '../lib/drums/pocketOperations';
import { SynthEngine } from '../lib/SynthEngine';
import { TPQN } from '../lib/chords/MidiGenerator';

interface DrumPatternSectionProps {
  section: string;
}

type StepGrid = Record<string, boolean[]>;

// General MIDI channel 10 drum map
const GM_DRUMS: Record<string, number> = {
  BD: 36,
  SN: 38,
  RS: 37,
  CL: 39,
  CH: 42,
  OH: 46,
  CY: 49,
  CB: 56,
  LT: 45,
  MT: 47,
  HT: 50,
  SH: 82,
  HC: 63,
  LC: 64,
  AC: 57,
};

const DISPLAY_ORDER = ['BD', 'SN', 'RS', 'CL', 'CH', 'OH', 'CY', 'CB', 'LT', 'MT', 'HT', 'SH', 'HC', 'LC', 'AC'];

const buildGrid = (pattern: PocketOperationPattern): { grid: StepGrid; totalSteps: number } => {
  const totalSteps = pattern.totalSteps || DEFAULT_STEPS;
  const grid: StepGrid = {};
  (Object.entries(pattern.instruments || {}) as Array<[string, number[]]>).forEach(([instrument, steps]) => {
    const normalized = Array.from({ length: totalSteps }, () => false);
    steps.forEach((step: number) => {
      const index = Math.min(totalSteps - 1, Math.max(0, step - 1));
      normalized[index] = true;
    });
    grid[instrument] = normalized;
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

const DrumPatternSection: React.FC<DrumPatternSectionProps> = ({ section }) => {
  const patterns = useMemo<PocketOperationPattern[]>(
    () => pocketOperationPatterns.filter((pattern: PocketOperationPattern) => pattern.section === section),
    [section],
  );
  const [selectedName, setSelectedName] = useState<string>(patterns[0]?.name ?? '');
  const selectedPattern = useMemo<PocketOperationPattern | undefined>(
    () => patterns.find((pattern: PocketOperationPattern) => pattern.name === selectedName) ?? patterns[0],
    [selectedName, patterns],
  );

  const [grid, setGrid] = useState<StepGrid>({});
  const [totalSteps, setTotalSteps] = useState(DEFAULT_STEPS);
  const [bpm, setBpm] = useState(96);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<string>('Select a pattern to preview or export.');
  const intervalRef = useRef<number | null>(null);
  const synthRef = useRef<SynthEngine | null>(null);

  useEffect(() => {
    if (patterns.length === 0) {
      setSelectedName('');
      return;
    }
    if (!patterns.find((pattern: PocketOperationPattern) => pattern.name === selectedName)) {
      setSelectedName(patterns[0]!.name);
    }
  }, [patterns, selectedName]);

  useEffect(() => {
    if (!selectedPattern) return;
    const next = buildGrid(selectedPattern);
    setGrid(next.grid);
    setTotalSteps(next.totalSteps);
    setCurrentStep(0);
  }, [selectedPattern]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    synthRef.current = new SynthEngine(0.42);
    return () => {
      synthRef.current?.stopAll();
      synthRef.current = null;
    };
  }, []);

  const stepMs = useMemo(() => (60 / Math.max(1, bpm)) * 1000 / 4, [bpm]);

  const visibleInstruments = useMemo(() => {
    if (!selectedPattern) return [];
    const present = Object.keys(selectedPattern.instruments);
    const ordered = DISPLAY_ORDER.filter((instrument) => present.includes(instrument));
    const extras = present.filter((instrument) => !DISPLAY_ORDER.includes(instrument));
    return [...ordered, ...extras];
  }, [selectedPattern]);

  const playStep = useCallback(
    (index: number) => {
      const synth = synthRef.current;
      if (!synth) return;
      visibleInstruments.forEach((instrument) => {
        const hits = grid[instrument];
        if (!hits) return;
        if (hits[index]) {
          const note = GM_DRUMS[instrument];
          if (note !== undefined) {
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
      const current = prev[instrument] ?? Array.from({ length: totalSteps }, () => false);
      const updated = [...current];
      updated[index] = !updated[index];
      return { ...prev, [instrument]: updated };
    });
  };

  const handlePlayPause = async () => {
    if (!synthRef.current) {
      setStatus('Audio is unavailable in this environment.');
      return;
    }
    await synthRef.current.ensureContextResumed();
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
    synthRef.current?.stopAll();
  };

  const exportMidi = () => {
    if (!selectedPattern) return;
    const track = new MidiWriter.Track();
    track.setTempo(bpm);
    track.setTimeSignature(4, 4, 24, 8);
    const ticksPerStep = Math.max(1, Math.round(TPQN / 4));

    visibleInstruments.forEach((instrument) => {
      const midiNote = GM_DRUMS[instrument];
      if (midiNote === undefined) return;
      const hits = grid[instrument] ?? [];
      hits.forEach((isHit, index) => {
        if (!isHit) return;
        track.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [midiNote],
            tick: index * ticksPerStep,
            duration: 'T' + ticksPerStep,
            velocity: 100,
            channel: 10,
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
    <div className="card bg-base-200/70">
      <div className="card-body space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="badge badge-outline badge-secondary">{section}</div>
            <h3 className="card-title text-xl font-bold leading-tight">
              {selectedPattern.name}
            </h3>
            <p className="text-sm text-base-content/70">
              Page {selectedPattern.page ?? '—'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="form-control w-full max-w-xs">
              <div className="label">
                <span className="label-text text-sm">Pattern</span>
              </div>
              <select
                className="select select-bordered select-sm w-full max-w-xs"
                value={selectedPattern.name}
                onChange={(event) => setSelectedName(event.target.value)}
              >
                {patterns.map((pattern: PocketOperationPattern) => (
                  <option key={pattern.name} value={pattern.name}>
                    {pattern.name} (p.{pattern.page ?? '—'})
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control w-full max-w-xs">
              <div className="label">
                <span className="label-text text-sm">Tempo {bpm} BPM</span>
              </div>
              <input
                type="range"
                min={70}
                max={160}
                value={bpm}
                onChange={(event) => setBpm(Number(event.target.value))}
                className="range range-xs range-primary"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          {visibleInstruments.map((instrument) => {
            const hits = grid[instrument] ?? Array.from({ length: totalSteps }, () => false);
            const label = pocketLegend[instrument] ?? instrument;
            return (
              <div key={instrument} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-base-content/80">
                  <span className="badge badge-outline badge-sm">{instrument}</span>
                  <span>{label}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {hits.map((isHit, index) => {
                    const isCurrent = isPlaying && currentStep === index;
                    const active = isHit;
                    const base = 'btn btn-xs btn-square font-semibold transition-colors duration-150';
                    const activeClasses = active
                      ? 'btn-primary text-primary-content'
                      : 'btn-outline btn-neutral text-base-content/60';
                    const indicator = isCurrent ? 'ring ring-secondary ring-offset-2 ring-offset-base-200' : '';
                    return (
                      <button
                        key={`${instrument}-${index}`}
                        type="button"
                        className={`${base} ${activeClasses} ${indicator}`}
                        onClick={() => toggleStep(instrument, index)}
                        aria-pressed={active}
                        aria-label={`Step ${index + 1} for ${instrument}`}
                      >
                        {index + 1}
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
    </div>
  );
};

export default DrumPatternSection;
