import React, { useEffect, useMemo, useRef } from 'react';
import { PianoRollDrawer } from '../lib/chords/PianoRollDrawer';
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawerRef = useRef<PianoRollDrawer | null>(null);
  const activeChordNotes = useRef<Map<number, ActiveNote[]>>(new Map());

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      drawerRef.current = new PianoRollDrawer(canvasRef.current);
    } catch (error) {
      console.error('Unable to setup piano roll', error);
    }

    const handleResize = () => drawerRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      drawerRef.current = null;
    };
  }, []);

  useEffect(() => {
    drawerRef.current?.draw(notes);
  }, [notes]);

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
    <div className="space-y-4">
      <header>
        <h3 className="text-lg font-semibold">Piano Roll Preview</h3>
        <p className="text-sm text-base-content/70">
          Visual representation of the generated notes and quick-access chord audition buttons.
        </p>
      </header>

      <canvas ref={canvasRef} className="w-full h-64 rounded-xl border border-base-300 bg-base-200" />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {playableChords.length === 0 && <span className="text-sm text-base-content/70">Generate a progression to get chord buttons.</span>}
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

      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" className="btn btn-success" onClick={onPlayProgression} disabled={isLooping}>
          ▶ Play Progression (Loop)
        </button>
        <button type="button" className="btn btn-error btn-outline" onClick={onStopProgression} disabled={!isLooping}>
          ■ Stop
        </button>
        <span className="badge badge-outline">Loop status: {isLooping ? 'Playing' : 'Idle'}</span>
      </div>
    </div>
  );
};

export default ChordProgressionPianoRoll;
