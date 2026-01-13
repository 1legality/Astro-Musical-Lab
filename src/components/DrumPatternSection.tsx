import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MidiWriter from 'midi-writer-js';
import {
  pocketOperationPatterns,
  sectionsInOrder,
  GM_DRUM_MAP,
  DEFAULT_STEPS,
  type PocketOperationPattern,
} from '../lib/drums/pocketOperations';

import { TPQN } from '../lib/chords/MidiGenerator';
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

const buildMidiBlob = (midiDataBytes: unknown): Blob => {
  if (typeof Uint8Array !== 'undefined' && midiDataBytes instanceof Uint8Array) {
    const copy = new Uint8Array(midiDataBytes.length);
    copy.set(midiDataBytes);
    return new Blob([copy], { type: 'audio/midi' });
  }
  if (midiDataBytes && (midiDataBytes instanceof ArrayBuffer || ArrayBuffer.isView(midiDataBytes))) {
    return new Blob([midiDataBytes as ArrayBuffer], { type: 'audio/midi' });
  }
  try {
    return new Blob([midiDataBytes as BlobPart], { type: 'audio/midi' });
  } catch {
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
  const [status, setStatus] = useState<string>('Select a pattern to preview or export.');
  const [midiChannel, setMidiChannel] = useState<'all' | number>('all');

  // Keep pattern name in sync when section changes
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

  // Reset pattern when section changes
  useEffect(() => {
    if (patterns.length > 0) {
      const preferred = patterns.find((pattern) => pattern.name === DEFAULT_PATTERN_NAME) ?? patterns[0];
      setSelectedName(preferred.name);
    }
  }, [patterns]);

  // Build grid when pattern changes
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

  // Use the drum playback hook
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
    const ticksPerStep = Math.max(1, Math.round(TPQN / 4));

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
    const blob = buildMidiBlob(midiData);
    const filename = `${slugify(selectedPattern.name)}-${Math.round(bpm)}bpm.mid`;
    triggerDownload(blob, filename);
    setStatus(`Exported ${filename} (GM Ch ${channel}, Polyphonic).`);
  }, [selectedPattern, bpm, midiChannel, visibleInstruments, grid]);

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

            <DrumStepGrid
              grid={grid}
              visibleInstruments={visibleInstruments}
              totalSteps={totalSteps}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onToggleStep={toggleStep}
            />

            <DrumTransportControls
              isPlaying={isPlaying}
              bpm={bpm}
              status={status}
              onPlayPause={handlePlayPause}
              onStop={handleStop}
              onExportMidi={exportMidi}
            />
          </div>

          <DrumPatternSelector
            selectedSection={selectedSection}
            onSectionChange={setSelectedSection}
            patterns={patterns}
            selectedName={selectedPattern.name}
            onPatternChange={setSelectedName}
            midiChannel={midiChannel}
            onMidiChannelChange={setMidiChannel}
            bpm={bpm}
            onBpmChange={setBpm}
          />
        </div>
      </div>
    </div>
  );
};

export default DrumPatternSection;
