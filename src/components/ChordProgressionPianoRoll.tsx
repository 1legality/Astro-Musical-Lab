import React, { useEffect, useMemo, useRef } from 'react';
import type { NoteData, ChordGenerationData } from '../lib/chords/MidiGenerator';
import type { SynthChordPlayer, ActiveNote } from '../lib/chords/SynthChordPlayer';

interface ChordProgressionPianoRollProps {
  notes: NoteData[];
  chordDetails: ChordGenerationData[];
  synth: SynthChordPlayer | null;
  chordIndicator: string;
  onChordIndicatorChange: (text: string) => void;
  onPlayProgression: () => void;
  onStopProgression: () => void;
  isLooping: boolean;
}

const PianoRollDisplay: React.FC<{ notes: NoteData[] }> = ({ notes }) => {
  if (!notes || notes.length === 0) {
    return (
      <div className="h-64 w-full bg-base-200 flex items-center">
        <p className="text-base-content/70 w-full text-center">No notes to display</p>
      </div>
    );
  }

  let minMidi = 127;
  let maxMidi = 0;
  let maxTimeTicks = 0;
  notes.forEach(note => {
    minMidi = Math.min(minMidi, note.midiNote);
    maxMidi = Math.max(maxMidi, note.midiNote);
    maxTimeTicks = Math.max(maxTimeTicks, note.startTimeTicks + note.durationTicks);
  });

  minMidi = Math.max(0, minMidi - 2);
  maxMidi = Math.min(127, maxMidi + 2);
  const midiRange = maxMidi - minMidi + 1;
  if (maxTimeTicks <= 0) maxTimeTicks = 1;

  const gridLines = [];
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    if (midi % 12 === 0) {
      const y = ((midi - minMidi + 0.5) / midiRange) * 100;
      gridLines.push(
        <div
          key={`grid-${midi}`}
          className="absolute w-full border-t border-base-content/10"
          style={{ bottom: `${y}%`, left: 0 }}
        />
      );
    }
  }

  return (
    <div className="relative h-64 w-full bg-base-200 overflow-hidden">
      {gridLines}
      {notes.map((note, index) => {
        const left = (note.startTimeTicks / maxTimeTicks) * 100;
        const width = (note.durationTicks / maxTimeTicks) * 100;
        const bottom = ((note.midiNote - minMidi) / midiRange) * 100;
        const height = (1 / midiRange) * 100;

        return (
          <div
            key={index}
            className="absolute bg-primary"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              bottom: `${bottom}%`,
              height: `${height}%`,
              minWidth: '1px',
              minHeight: '1px',
            }}
          />
        );
      })}
    </div>
  );
};


const ChordProgressionPianoRoll: React.FC<ChordProgressionPianoRollProps> = ({
  notes,
  chordDetails,
  synth,
  chordIndicator,
  onChordIndicatorChange,
  onPlayProgression,
  onStopProgression,
  isLooping,
}) => {
  const activeChordNotes = useRef<Map<number, ActiveNote[]>>(new Map());

  useEffect(() => {
    return () => {
      activeChordNotes.current.forEach((active) => synth?.stopNotes(active));
      activeChordNotes.current.clear();
    };
  }, [synth]);

  useEffect(() => {
    activeChordNotes.current.forEach((active) => synth?.stopNotes(active));
    activeChordNotes.current.clear();
  }, [notes, chordDetails, synth]);

  const playableChords = useMemo(
    () => chordDetails.filter((cd) => cd.isValid && cd.adjustedVoicing && cd.adjustedVoicing.length > 0),
    [chordDetails]
  );

  const startPreviewChord = async (index: number) => {
    if (!synth) return;
    const chord = playableChords[index];
    if (!chord) return;
    await synth.ensureContextResumed();

    let midiNotes = notes
      .filter((note) => note.startTimeTicks === chord.startTimeTicks)
      .map((note) => note.midiNote);
    if (midiNotes.length === 0) {
      midiNotes = chord.adjustedVoicing ?? [];
    }
    if (midiNotes.length === 0) return;

    const active = synth.startChord(midiNotes);
    activeChordNotes.current.set(index, active);
    onChordIndicatorChange(`Playing: ${chord.symbol}`);
  };

  const stopPreviewChord = (index: number) => {
    const active = activeChordNotes.current.get(index);
    if (active && synth) {
      synth.stopNotes(active);
    }
    activeChordNotes.current.delete(index);
  };

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h3 className="card-title text-lg font-semibold">Piano Roll Preview</h3>
        <p className="text-sm text-base-content/70">
          Visual representation of the generated notes and quick-access chord audition buttons.
        </p>
      </header>

      <div className="rounded-box border border-base-300 shadow-inner overflow-hidden">
        <PianoRollDisplay notes={notes} />
      </div>

      <div className="rounded-box border border-base-300/70 bg-base-100/70 p-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          {playableChords.length === 0 && (
            <span className="text-sm text-base-content/70">Generate a progression to get chord buttons.</span>
          )}
          {playableChords.map((chord, index) => (
            <button
              type="button"
              key={`${chord.symbol}-${index}`}
              className="btn btn-outline btn-sm"
              onMouseDown={() => startPreviewChord(index)}
              onMouseUp={() => stopPreviewChord(index)}
              onMouseLeave={() => stopPreviewChord(index)}
              onTouchStart={(event) => {
                event.preventDefault();
                startPreviewChord(index);
              }}
              onTouchEnd={(event) => {
                event.preventDefault();
                stopPreviewChord(index);
              }}
              onTouchCancel={(event) => {
                event.preventDefault();
                stopPreviewChord(index);
              }}
            >
              {chord.symbol}
            </button>
          ))}
        </div>
        <p className="text-sm text-base-content/70">{chordIndicator}</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          className="btn btn-primary w-full sm:w-auto"
          onClick={onPlayProgression}
          disabled={isLooping}
        >
          Play Progression (Loop)
        </button>
        <button
          type="button"
          className="btn btn-outline btn-error w-full sm:w-auto"
          onClick={onStopProgression}
          disabled={!isLooping}
        >
          Stop
        </button>
        <span className="badge badge-outline">Loop status: {isLooping ? 'Playing' : 'Idle'}</span>
      </div>
    </div>
  );
};

export default ChordProgressionPianoRoll;