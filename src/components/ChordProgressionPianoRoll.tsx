import React, { useEffect, useMemo, useRef } from 'react';
import type { NoteData, ChordGenerationData } from '../lib/chords/MidiGenerator';
import type { SynthChordPlayer, ActiveNote } from '../lib/chords/SynthChordPlayer';
import { midiService } from '../lib/chords/MidiService';

interface ChordProgressionPianoRollProps {
  notes: NoteData[];
  chordDetails: ChordGenerationData[];
  synth: SynthChordPlayer | null;
  chordIndicator: string;
  onChordIndicatorChange: (text: string) => void;
  onPlayProgression: () => void;
  onStopProgression: () => void;
  isLooping: boolean;
  selectedMidiOutputId?: string;
  midiChannel?: number;
}

const PianoRollDisplay: React.FC<{ notes: NoteData[] }> = ({ notes }) => {
  if (!notes || notes.length === 0) {
    return (
      <div className="h-24 w-full bg-base-100/60 rounded-xl flex items-center justify-center">
        <p className="text-xs text-base-content/50">No notes to display</p>
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

  return (
    <div className="relative h-24 w-full bg-base-100/60 rounded-xl overflow-hidden border border-base-300">
      {notes.map((note, index) => {
        const left = (note.startTimeTicks / maxTimeTicks) * 100;
        const width = (note.durationTicks / maxTimeTicks) * 100;
        const bottom = ((note.midiNote - minMidi) / midiRange) * 100;
        const height = (1 / midiRange) * 100;

        return (
          <div
            key={index}
            className="absolute bg-primary rounded-sm"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              bottom: `${bottom}%`,
              height: `${height}%`,
              minWidth: '2px',
              minHeight: '2px',
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
  selectedMidiOutputId,
  midiChannel = 0,
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

    if (selectedMidiOutputId) {
      midiService.sendChordOn(selectedMidiOutputId, midiNotes, 0x7f, midiChannel - 1);
    }

    onChordIndicatorChange(`Playing: ${chord.symbol}`);
  };

  const stopPreviewChord = (index: number) => {
    const active = activeChordNotes.current.get(index);
    if (active && synth) {
      synth.stopNotes(active);
    }

    if (selectedMidiOutputId) {
      const chord = playableChords[index];
      if (chord) {
        let midiNotes = notes
          .filter((note) => note.startTimeTicks === chord.startTimeTicks)
          .map((note) => note.midiNote);
        if (midiNotes.length === 0) midiNotes = chord.adjustedVoicing ?? [];

        midiService.sendChordOff(selectedMidiOutputId, midiNotes, midiChannel - 1);
      }
    }

    activeChordNotes.current.delete(index);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide mt-0">Piano Roll Preview</h3>

      <PianoRollDisplay notes={notes} />

      <div className="space-y-2">
        <span className="label-text text-xs uppercase tracking-wide">Chord Buttons</span>
        <div className="flex flex-wrap gap-2">
          {playableChords.length === 0 && (
            <span className="text-xs text-base-content/50">Enter a progression to see chord buttons.</span>
          )}
          {playableChords.map((chord, index) => (
            <button
              type="button"
              key={`${chord.symbol}-${index}`}
              className="btn btn-xs btn-outline"
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
        <p className="text-xs text-base-content/50">{chordIndicator}</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onPlayProgression}
          disabled={isLooping || playableChords.length === 0}
        >
          {isLooping ? 'Playing...' : 'Play Loop'}
        </button>
        <button
          type="button"
          className="btn btn-error btn-sm"
          onClick={onStopProgression}
          disabled={!isLooping}
        >
          Stop
        </button>
        <span className="badge badge-outline badge-lg font-mono">
          {isLooping ? 'Playing' : 'Idle'}
        </span>
      </div>
    </div>
  );
};

export default ChordProgressionPianoRoll;