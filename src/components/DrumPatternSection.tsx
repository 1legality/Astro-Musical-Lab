import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  pocketOperationPatterns,
  sectionsInOrder,
  GM_DRUM_MAP,
  DEFAULT_STEPS,
  type PocketOperationPattern,
} from '../lib/drums/pocketOperations';

import { useDrumPlayback, type StepGrid } from '../hooks/useDrumPlayback';
import { DrumStepGrid, DrumTransportControls, DrumPatternSelector } from './drums';

const DISPLAY_ORDER = ['BD', 'SN', 'RS', 'CL', 'CH', 'OH', 'CY', 'CB', 'LT', 'MT', 'HT', 'SH', 'HC', 'LC', 'AC'];

const NORMAL_VELOCITY = 110;
const GHOST_VELOCITY = 40;

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

const DEFAULT_PATTERN_NAME = 'ONE AND SEVEN & FIVE AND THIRTEEN';

const DrumPatternSection: React.FC = () => {
  const defaultSection = useMemo(() => {
    const match = pocketOperationPatterns.find((pattern) => pattern.name === DEFAULT_PATTERN_NAME);
    return match?.section ?? sectionsInOrder[0] ?? '';
  }, []);

  const [selectedSection, setSelectedSection] = useState<string>(defaultSection);

  const patterns = useMemo<PocketOperationPattern[]>(
    () => pocketOperationPatterns.filter((pattern) => pattern.section === selectedSection),
    [selectedSection],
  );

  const initialPatternName = useMemo(() => {
    const defaultPattern = patterns.find((pattern) => pattern.name === DEFAULT_PATTERN_NAME);
    return defaultPattern?.name ?? patterns[0]?.name ?? '';
  }, [patterns]);

  const [selectedName, setSelectedName] = useState<string>(initialPatternName);
  const selectedPattern = useMemo<PocketOperationPattern | undefined>(
    () => patterns.find((pattern) => pattern.name === selectedName) ?? patterns[0],
    [selectedName, patterns],
  );

  const [grid, setGrid] = useState<StepGrid>({});
  const [totalSteps, setTotalSteps] = useState(DEFAULT_STEPS);
  const [bpm, setBpm] = useState(120);
  const [midiChannel, setMidiChannel] = useState<'all' | number>('all');
  const [status, setStatus] = useState<string>('Select a pattern to preview or edit.');

  useEffect(() => {
    if (patterns.length === 0) {
      setSelectedName('');
      return;
    }
    if (!patterns.find((pattern) => pattern.name === selectedName)) {
      const fallback = patterns.find((pattern) => pattern.name === DEFAULT_PATTERN_NAME) ?? patterns[0]!;
      setSelectedName(fallback.name);
    }
  }, [patterns, selectedName]);

  useEffect(() => {
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
  }, [selectedPattern]);

  const visibleInstruments = useMemo(() => {
    if (!selectedPattern) return [];
    const present = Object.keys(grid);
    if (present.length === 0) return ['BD', 'SN', 'CH'];

    const ordered = DISPLAY_ORDER.filter((instrument) => present.includes(instrument));
    const extras = present.filter((instrument) => !DISPLAY_ORDER.includes(instrument));
    return [...ordered, ...extras];
  }, [grid, selectedPattern]);

  const {
    isPlaying,
    currentStep,
    handlePlayPause,
    handleStop,
  } = useDrumPlayback({
    grid,
    totalSteps,
    bpm,
    visibleInstruments,
  });

  const toggleStep = useCallback((instrument: string, index: number) => {
    setGrid((prev) => {
      const current = prev[instrument] ?? Array.from({ length: totalSteps }, () => 0);
      const updated = [...current];
      if (updated[index] === 0) updated[index] = NORMAL_VELOCITY;
      else if (updated[index] === NORMAL_VELOCITY) updated[index] = GHOST_VELOCITY;
      else updated[index] = 0;

      return { ...prev, [instrument]: updated };
    });
  }, [totalSteps]);

  const addEarCandy = useCallback(() => {
    setGrid((prevGrid) => {
      const newGrid = { ...prevGrid };
      const instruments = Object.keys(newGrid);
      if (instruments.length === 0) return prevGrid;

      const candidates = instruments.filter((i) => ['CH', 'OH', 'SN', 'SH', 'CL'].includes(i));
      const targetInstrument = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : instruments[Math.floor(Math.random() * instruments.length)];

      const track = [...(newGrid[targetInstrument] || [])];
      const emptyIndices = track.map((v, i) => (v === 0 ? i : -1)).filter((i) => i !== -1);

      if (emptyIndices.length > 0) {
        const numAdds = Math.floor(Math.random() * 2) + 1;
        for (let k = 0; k < numAdds; k++) {
          const idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          track[idx] = GHOST_VELOCITY;
        }
        newGrid[targetInstrument] = track;
        setStatus(`Added ear candy to ${targetInstrument}!`);
      } else {
        setStatus('No space for ear candy on ' + targetInstrument);
      }

      return newGrid;
    });
  }, []);

  const resetPattern = useCallback(() => {
    if (!selectedPattern) return;
    const next = buildGrid(selectedPattern);
    setGrid(next.grid);
    setStatus('Pattern reset to original.');
  }, [selectedPattern]);

  const exportMidi = useCallback(() => {
    if (!selectedPattern) return;
    // Dynamic import to avoid SSR issues if necessary, though we are in client component file
    import('midi-writer-js').then((MidiWriterModule) => {
      const MidiWriter = MidiWriterModule.default;
      const ticksPerStep = Math.max(1, Math.round(128 / 4)); // assuming 128 TPQN default, or import TPQN

      interface AbsEvent {
        tick: number;
        type: 'on' | 'off';
        pitch: number;
        velocity: number;
      }

      const absEvents: AbsEvent[] = [];
      const channel = midiChannel === 'all' ? 10 : midiChannel;

      visibleInstruments.forEach((instrument) => {
        const midiNote = GM_DRUM_MAP[instrument as keyof typeof GM_DRUM_MAP];
        if (midiNote === undefined) return;
        const velocities = grid[instrument] ?? [];

        velocities.forEach((vel, stepIndex) => {
          if (vel > 0) {
            const startTick = stepIndex * ticksPerStep;
            const endTick = startTick + ticksPerStep;

            absEvents.push({ tick: startTick, type: 'on', pitch: midiNote, velocity: vel });
            absEvents.push({ tick: endTick, type: 'off', pitch: midiNote, velocity: 0 });
          }
        });
      });

      absEvents.sort((a, b) => {
        if (a.tick !== b.tick) return a.tick - b.tick;
        if (a.type === 'off' && b.type === 'on') return -1;
        if (a.type === 'on' && b.type === 'off') return 1;
        return 0;
      });

      const track = new MidiWriter.Track();
      track.setTempo(bpm);
      track.setTimeSignature(4, 4, 24, 8);
      track.addInstrumentName('DrumKit');

      let cursor = 0;

      absEvents.forEach((evt) => {
        const delta = evt.tick - cursor;
        const durationStr = 'T' + delta;
        const waitStr = 'T' + delta;

        if (evt.type === 'on') {
          track.addEvent(
            new MidiWriter.NoteOnEvent({
              pitch: evt.pitch,
              velocity: evt.velocity,
              wait: waitStr,
              channel: channel,
            })
          );
        } else {
          track.addEvent(
            new MidiWriter.NoteOffEvent({
              pitch: evt.pitch,
              duration: durationStr,
              channel: channel,
              velocity: 0,
            })
          );
        }
        cursor = evt.tick;
      });

      const midiData = new MidiWriter.Writer([track]).buildFile();

      // Helper to build blob
      const buildMidiBlob = (midiDataBytes: any): Blob => {
        if (typeof Uint8Array !== 'undefined' && midiDataBytes instanceof Uint8Array) {
          const copy = new Uint8Array(midiDataBytes.length);
          copy.set(midiDataBytes);
          return new Blob([copy], { type: 'audio/midi' });
        }
        return new Blob([midiDataBytes], { type: 'audio/midi' });
      };

      const blob = buildMidiBlob(midiData);
      const filename = `${selectedPattern.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.round(bpm)}bpm.mid`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setStatus(`Exported ${filename} (GM Ch ${channel}).`);
    });
  }, [selectedPattern, bpm, midiChannel, visibleInstruments, grid]);

  if (!selectedPattern) {
    return (
      <div className="alert alert-warning">
        <span>No patterns found for this section.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Top section: All Controls in unified grid */}
        <div className="card bg-base-200/70">
          <div className="card-body">
            <div className="grid grid-cols-12 gap-4 items-end">
              {/* Transport buttons */}
              <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                <span className="label-text text-xs uppercase tracking-wide mb-1 block">Transport</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={handlePlayPause} className="btn btn-primary btn-sm">
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button onClick={handleStop} className="btn btn-error btn-sm">
                    Stop
                  </button>
                  <div className="badge badge-outline badge-lg font-mono">
                    {bpm} BPM
                  </div>
                </div>
              </div>

              {/* Section selector */}
              <div className="col-span-6 sm:col-span-3 lg:col-span-2 form-control">
                <span className="label-text text-xs uppercase tracking-wide mb-1">Section</span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                >
                  {sectionsInOrder.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pattern selector */}
              <div className="col-span-6 sm:col-span-3 lg:col-span-3 form-control">
                <span className="label-text text-xs uppercase tracking-wide mb-1">Pattern</span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={selectedPattern.name}
                  onChange={(e) => setSelectedName(e.target.value)}
                >
                  {patterns.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tempo input */}
              <div className="col-span-6 lg:col-span-2 form-control">
                <span className="label-text text-xs uppercase tracking-wide mb-1">Tempo</span>
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

              {/* MIDI Channel */}
              <div className="col-span-6 lg:col-span-2 form-control">
                <span className="label-text text-xs uppercase tracking-wide mb-1">MIDI Ch</span>
                <select
                  className="select select-bordered select-sm w-full"
                  value={midiChannel}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all') setMidiChannel('all');
                    else setMidiChannel(Number(val));
                  }}
                >
                  <option value="all">All (10)</option>
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                    <option key={ch} value={ch}>Ch {ch}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Second row: Actions and status */}
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-base-content/10">
              <button onClick={exportMidi} className="btn btn-xs btn-outline" title="Download MIDI file">
                Export MIDI
              </button>
              <button
                onClick={addEarCandy}
                className="btn btn-xs btn-outline border-secondary text-secondary hover:bg-secondary/20"
                title="Add random ghost notes"
              >
                ✨ Ear Candy
              </button>
              <button onClick={resetPattern} className="btn btn-xs btn-ghost" title="Reset to original pattern">
                Reset
              </button>
              <span className="text-xs text-base-content/70 italic ml-auto">{status}</span>
            </div>
          </div>
        </div>

        {/* Middle section: Step Grid */}
        <div className="card bg-base-200/70">
          <div className="card-body space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide mt-0">
              {selectedPattern.name}
            </h3>
            <DrumStepGrid
              grid={grid}
              visibleInstruments={visibleInstruments}
              totalSteps={totalSteps}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onToggleStep={toggleStep}
            />
          </div>
        </div>

        {/* Bottom section: Tip */}
        <div className="card bg-base-200/70">
          <div className="card-body py-4 text-sm text-base-content/70">
            <p>
              Select a pattern from the Pocket Operations library and tweak the grid to your liking.
              Ghost notes add subtle groove without overpowering the main hits.
              Tip: Use "Ear Candy" to add random ghost notes for variation, or hand-edit the grid for precise control.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrumPatternSection;
