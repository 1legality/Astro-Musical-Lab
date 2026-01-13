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
  type ChordGenerationData,
} from '../lib/chords/MidiGenerator';
import { VALID_DURATION_CODES, generateValidChordPattern } from '../lib/chords/ValidationUtils';
import { exportProgressionToPdf } from '../lib/chords/PrintProgression';
import { useChordPlayback } from '../hooks/useChordPlayback';
import { useMidiOutput } from '../hooks/useMidiOutput';
import MidiOutputSelector from './ui/MidiOutputSelector';

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

const ChordProgressionGenerator: React.FC = () => {
  const midiGenerator = useMemo(() => new MidiGenerator(), []);
  const [formValues, setFormValues] = useState<FormValues>(defaultValues);
  const [status, setStatus] = useState<StatusMessage>({
    tone: 'muted',
    message: 'Enter a progression to begin.',
  });
  const [generation, setGeneration] = useState<MidiGenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  const {
    outputs: midiOutputs,
    selectedId: selectedMidiOutputId,
    channel: selectedMidiChannel,
    error: midiError,
    setSelectedId: setSelectedMidiOutputId,
    setChannel: setSelectedMidiChannel,
    refresh: refreshMidiOutputs,
  } = useMidiOutput();

  const {
    isLooping,
    chordIndicator,
    playbackProgress,
    startLoop,
    stopLoop,
    synth,
    setChordIndicator,
  } = useChordPlayback({
    generation,
    outputType: formValues.outputType,
    tempo: formValues.tempo,
    midiOutputId: selectedMidiOutputId,
    midiChannel: selectedMidiChannel,
  });

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
      } catch {
        console.warn('URL state could not be updated.');
      }
    },
    [urlReady]
  );

  const handleGenerate = useCallback(
    (options?: { download?: boolean }) => {
      const trimmed = formValues.progression.trim();
      if (!trimmed) {
        stopLoop();
        setGeneration(null);
        setStatus({ tone: 'muted', message: 'Enter a progression to begin.' });
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
    }, 500);

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
      setStatus({ tone: 'success', message: 'URL copied to clipboard.' });
    } catch (error) {
      console.error('Failed to copy share URL', error);
      setStatus({ tone: 'error', message: 'Unable to copy link.' });
    }
  }, []);

  const handleExportPdf = useCallback(async () => {
    if (!generation) {
      setStatus({ tone: 'error', message: 'Generate a preview first.' });
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
      setStatus({ tone: 'success', message: 'PDF exported.' });
    } catch (error) {
      console.error('PDF export error', error);
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to create PDF.',
      });
    }
  }, [formValues, generation]);

  const notesForRoll: NoteData[] = generation?.notesForPianoRoll ?? [];
  const chordDetails: ChordGenerationData[] = generation?.chordDetails ?? [];

  return (
    <div className="space-y-6">
      {/* Row 1: Form controls */}
      <div className="card bg-base-200/70">
        <div className="card-body space-y-4">
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

      {/* Row 2: MIDI Output */}
      <div className="card bg-base-200/70">
        <div className="card-body space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide mt-0">MIDI Output</h3>
          <MidiOutputSelector
            outputs={midiOutputs}
            selectedId={selectedMidiOutputId}
            onSelectId={setSelectedMidiOutputId}
            channel={selectedMidiChannel}
            onChannelChange={setSelectedMidiChannel}
            onRefresh={refreshMidiOutputs}
            error={midiError}
          />
        </div>
      </div>

      {/* Row 3: Piano roll + playback */}
      <div className="card bg-base-200/70">
        <div className="card-body space-y-4">
          <ChordProgressionPianoRoll
            notes={notesForRoll}
            chordDetails={chordDetails}
            synth={synth}
            chordIndicator={chordIndicator}
            onChordIndicatorChange={setChordIndicator}
            onPlayProgression={startLoop}
            onStopProgression={stopLoop}
            isLooping={isLooping}
            playbackProgress={playbackProgress}
            selectedMidiOutputId={selectedMidiOutputId}
            midiChannel={selectedMidiChannel}
          />
        </div>
      </div>
    </div>
  );
};

export default ChordProgressionGenerator;
