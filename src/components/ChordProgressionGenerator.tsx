import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChordProgressionForm from './ChordProgressionForm';
import ChordProgressionPianoRoll from './ChordProgressionPianoRoll';
import {
  MidiGenerator,
  type MidiGenerationOptions,
  type MidiGenerationResult,
  type NoteData,
  type OutputType,
  type InversionType,
  TPQN,
  type ChordGenerationData,
} from '../lib/chords/MidiGenerator';
import { SynthChordPlayer, type ActiveNote } from '../lib/chords/SynthChordPlayer';
import { VALID_DURATION_CODES, generateValidChordPattern } from '../lib/chords/ValidationUtils';
import { exportProgressionToPdf } from '../lib/chords/PrintProgression';

export interface FormValues {
  progression: string;
  outputFileName: string;
  tempo: number;
  baseOctave: number;
  chordDuration: string;
  outputType: OutputType;
  inversionType: InversionType;
}

export interface StatusMessage {
  tone: 'muted' | 'success' | 'error';
  message: string;
}

const defaultValues: FormValues = {
  progression: '',
  outputFileName: '',
  tempo: 120,
  baseOctave: 4,
  chordDuration: '1',
  outputType: 'chordsAndBass',
  inversionType: 'smooth',
};

interface ScheduleItem {
  notes: number[];
  durationSec: number;
  label: string;
}

const validSingleNotePattern = /^[A-G][#b]?1$/i;

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function validateProgression(rawProgression: string): string {
  const normalized = rawProgression
    .replace(/,/g, ' ')
    .replace(/\|/g, ' ')
    .replace(/->/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return '';
  }

  const entries = normalized.split(/\s+/);
  const validChordPattern = generateValidChordPattern();
  const validated: string[] = [];

  for (const entry of entries) {
    if (!entry) continue;
    const [symbol, durationStr] = entry.split(':');

    if (symbol.toUpperCase() === 'R') {
      if (durationStr === undefined || isNaN(parseFloat(durationStr)) || parseFloat(durationStr) <= 0) {
        throw new Error('Rest "R" must include a positive numeric duration (e.g., R:1).');
      }
      validated.push(entry);
      continue;
    }

    if (!validChordPattern.test(symbol) && !validSingleNotePattern.test(symbol)) {
      throw new Error(`Invalid chord symbol "${symbol}" in "${entry}". Use formats like C, Dm7, Gsus, or C1.`);
    }

    if (durationStr !== undefined) {
      const numericDuration = parseFloat(durationStr);
      const isValidNumeric = !isNaN(numericDuration) && numericDuration > 0;
      const isKnownCode = VALID_DURATION_CODES.includes(durationStr.toLowerCase());
      const isTickCode = /^t\d+$/i.test(durationStr);
      if (!isValidNumeric && !isKnownCode && !isTickCode) {
        throw new Error(
          `Invalid duration "${durationStr}" for chord "${symbol}". Use bar lengths as numbers (0.5, 1) or ticks (T128).`
        );
      }
      validated.push(`${symbol}:${durationStr}`);
    } else {
      validated.push(symbol);
    }
  }

  return validated.join(' ');
}

function buildSchedule(result: MidiGenerationResult | null, outputType: OutputType, tempo: number): ScheduleItem[] {
  if (!result || !result.chordDetails?.length) return [];
  const secPerTick = 60 / (Math.max(tempo, 1) * TPQN);

  return result.chordDetails
    .map((chord) => {
      const durationSec = Math.max(0, chord.durationTicks) * secPerTick;
      const notes = getNotesForOutputType(chord, outputType);
      return { notes, durationSec, label: chord.symbol || 'Chord' };
    })
    .filter((item) => item.durationSec > 0);
}

function getNotesForOutputType(chord: ChordGenerationData, outputType: OutputType): number[] {
  if (!chord.isValid) return [];
  switch (outputType) {
    case 'chordsOnly':
      return [...(chord.adjustedVoicing || [])];
    case 'chordsAndBass': {
      const notes = [...(chord.adjustedVoicing || [])];
      if (typeof chord.calculatedBassNote === 'number' && !notes.includes(chord.calculatedBassNote)) {
        notes.push(chord.calculatedBassNote);
      }
      return notes;
    }
    case 'bassOnly':
      return typeof chord.calculatedBassNote === 'number' ? [chord.calculatedBassNote] : [];
    case 'bassAndFifth':
      if (typeof chord.calculatedBassNote !== 'number') return [];
      const fifth = chord.calculatedBassNote + 7;
      return fifth >= 0 && fifth <= 127 ? [chord.calculatedBassNote, fifth] : [chord.calculatedBassNote];
    default:
      return [];
  }
}

const ChordProgressionGenerator: React.FC = () => {
  const midiGenerator = useMemo(() => new MidiGenerator(), []);
  const synthRef = useRef<SynthChordPlayer | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(defaultValues);
  const [status, setStatus] = useState<StatusMessage>({
    tone: 'muted',
    message: 'Enter a progression and tweak the options to begin.',
  });
  const [generation, setGeneration] = useState<MidiGenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chordIndicator, setChordIndicator] = useState('Click a chord button to play it.');
  const [isLooping, setIsLooping] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  const playbackTimeoutRef = useRef<number | null>(null);
  const playbackNotesRef = useRef<ActiveNote[] | null>(null);
  const playbackIndexRef = useRef(0);
  const isLoopingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    synthRef.current = new SynthChordPlayer(0.45);
    return () => {
      synthRef.current?.stopNotes();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) {
      setUrlReady(true);
      return;
    }
    setFormValues((prev) => {
      const next: FormValues = { ...prev };
      type NumericFormKeys = 'tempo' | 'baseOctave';
      const assignNumber = <K extends NumericFormKeys>(key: K, clamp?: (val: number) => number) => {
        const raw = params.get(key as string);
        if (raw === null) return;
        const parsed = parseFloat(raw);
        if (Number.isFinite(parsed)) {
          const value = clamp ? clamp(parsed) : parsed;
          next[key] = value as FormValues[K];
        }
      };

      type StringFormKeys = 'progression' | 'outputFileName' | 'chordDuration' | 'outputType' | 'inversionType';
      const assignString = <K extends StringFormKeys>(key: K) => {
        const raw = params.get(key as string);
        if (raw !== null && raw.trim() !== '') {
          next[key] = raw as FormValues[K];
        }
      };

      assignString('progression');
      assignString('outputFileName');
      assignString('chordDuration');
      assignString('outputType');
      assignString('inversionType');
      assignNumber('tempo', (value) => Math.min(300, Math.max(20, value)));
      assignNumber('baseOctave', (value) => Math.min(6, Math.max(1, value)));
      return next;
    });
    setUrlReady(true);
  }, []);

  const updateUrl = useCallback(
    (values: FormValues) => {
      if (typeof window === 'undefined' || !urlReady) return;
      const params = new URLSearchParams();
      const safeSet = (key: keyof FormValues) => {
        const value = values[key];
        if (value === undefined || value === null) return;
        const str = String(value).trim();
        if (str === '') return;
        params.set(key as string, str);
      };
      safeSet('progression');
      safeSet('outputFileName');
      safeSet('tempo');
      safeSet('baseOctave');
      safeSet('chordDuration');
      safeSet('outputType');
      safeSet('inversionType');

      const query = params.toString();
      const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      try {
        window.history.replaceState({}, '', url);
      } catch (e) {
        console.warn('URL state could not be updated, possibly due to sandboxing.');
      }
    },
    [urlReady]
  );


  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  const stopLoop = useCallback(() => {
    setIsLooping(false);
    isLoopingRef.current = false;
    if (playbackTimeoutRef.current !== null) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    if (playbackNotesRef.current && synthRef.current) {
      synthRef.current.stopNotes(playbackNotesRef.current);
      playbackNotesRef.current = null;
    }
    setChordIndicator('Click a chord button to play it.');
  }, []);

  const handleGenerate = useCallback(
    (options?: { download?: boolean }) => {
      const trimmed = formValues.progression.trim();
      if (!trimmed) {
        stopLoop();
        setGeneration(null);
        setStatus({ tone: 'muted', message: 'Enter a progression and click Download or tweak a setting.' });
        return;
      }

      try {
        const validated = validateProgression(trimmed);
        if (!validated) {
          stopLoop();
          setGeneration(null);
          setStatus({ tone: 'muted', message: 'Progression cleared.' });
          return;
        }
        setIsGenerating(true);

        const generatorOptions: MidiGenerationOptions = {
          progressionString: validated,
          outputFileName: formValues.outputFileName || undefined,
          outputType: formValues.outputType,
          inversionType: formValues.inversionType,
          baseOctave: formValues.baseOctave,
          chordDurationStr: formValues.chordDuration,
          tempo: formValues.tempo,
          velocity: 110,
        };

        const result = midiGenerator.generate(generatorOptions);
        setGeneration(result);
        setStatus({
          tone: options?.download ? 'success' : 'muted',
          message: options?.download ? `Downloading ${result.finalFileName}` : 'Preview updated.',
        });
        stopLoop();

        if (options?.download) {
          triggerDownload(result.midiBlob, result.finalFileName);
        }
      } catch (error) {
        console.error(error);
        stopLoop();
        setGeneration(null);
        setStatus({
          tone: 'error',
          message: error instanceof Error ? error.message : 'Failed to generate MIDI.',
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [formValues, midiGenerator, stopLoop]
  );

  const debounceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!urlReady) return;
    if (typeof window === 'undefined') return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = window.setTimeout(() => {
      updateUrl(formValues);
    }, 500); // 500ms debounce delay

    const generateHandle = window.setTimeout(() => handleGenerate(), 350);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      clearTimeout(generateHandle);
    };
  }, [formValues, handleGenerate, urlReady, updateUrl]);

  const handleValueChange = useCallback(
    <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleCopyShareUrl = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const shareUrl = `${window.location.origin}${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setStatus({ tone: 'success', message: 'Shareable URL copied to clipboard.' });
    } catch (error) {
      console.error('Failed to copy share URL', error);
      setStatus({ tone: 'error', message: 'Unable to copy link in this browser.' });
    }
  }, []);

  const handleExportPdf = useCallback(async () => {
    if (!generation) {
      setStatus({ tone: 'error', message: 'Generate a preview before exporting PDF.' });
      return;
    }
    try {
      const options: MidiGenerationOptions = {
        progressionString: validateProgression(formValues.progression),
        outputFileName: formValues.outputFileName || undefined,
        outputType: formValues.outputType,
        inversionType: formValues.inversionType,
        baseOctave: formValues.baseOctave,
        chordDurationStr: formValues.chordDuration,
        tempo: formValues.tempo,
        velocity: 110,
      };
      const blob = await exportProgressionToPdf(options);
      const name = (options.outputFileName?.replace(/\.mid$/, '') || 'progression') + '.pdf';
      triggerDownload(blob, name);
      setStatus({ tone: 'success', message: 'PDF export started.' });
    } catch (error) {
      console.error('PDF export error', error);
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to create PDF.',
      });
    }
  }, [formValues, generation]);

  const startLoop = useCallback(async () => {
    if (isLooping) return;
    const schedule = buildSchedule(generation, formValues.outputType, formValues.tempo);
    if (!schedule.length) {
      setStatus({ tone: 'error', message: 'Generate a progression first.' });
      return;
    }
    const synth = synthRef.current;
    if (!synth) {
      setStatus({ tone: 'error', message: 'Audio playback is unavailable in this environment.' });
      return;
    }

    await synth.ensureContextResumed();
    setIsLooping(true);
    isLoopingRef.current = true;
    playbackIndexRef.current = 0;

    const advance = () => {
      if (!synthRef.current) return;
      if (!isLoopingRef.current) return;
      const item = schedule[playbackIndexRef.current];

      if (playbackNotesRef.current) {
        synthRef.current.stopNotes(playbackNotesRef.current);
        playbackNotesRef.current = null;
      }

      if (item.notes.length > 0) {
        playbackNotesRef.current = synthRef.current.startChord(item.notes);
        setChordIndicator(`Playing: ${item.label}`);
      } else {
        setChordIndicator('Rest');
      }

      const nextDelay = Math.max(10, item.durationSec * 1000);
      playbackTimeoutRef.current = window.setTimeout(() => {
        playbackIndexRef.current = (playbackIndexRef.current + 1) % schedule.length;
        advance();
      }, nextDelay);
    };

    advance();
  }, [formValues.outputType, formValues.tempo, generation, isLooping]);

  const notesForRoll: NoteData[] = generation?.notesForPianoRoll ?? [];
  const chordDetails: ChordGenerationData[] = generation?.chordDetails ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body space-y-5">
            <ChordProgressionForm
              values={formValues}
              onValueChange={handleValueChange}
              onDownloadMidi={() => handleGenerate({ download: true })}
              onCopyShareUrl={handleCopyShareUrl}
              onExportPdf={handleExportPdf}
              status={status}
              isGenerating={isGenerating}
              hasPreview={notesForRoll.length > 0}
            />
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body space-y-4">
            <ChordProgressionPianoRoll
              notes={notesForRoll}
              chordDetails={chordDetails}
              synth={synthRef.current}
              chordIndicator={chordIndicator}
              onChordIndicatorChange={setChordIndicator}
              onPlayProgression={startLoop}
              onStopProgression={stopLoop}
              isLooping={isLooping}
            />
            <div className="text-xs text-base-content/70">
              Preview updates automatically whenever you change the form. The loop playback respects the current output
              type so you can focus on chords, bass, or both.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChordProgressionGenerator;
