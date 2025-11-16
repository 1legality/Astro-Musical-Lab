import React, { useState, useEffect } from 'react';
import type { OutputType, InversionType } from '../lib/chords/MidiGenerator';
import type { FormValues, StatusMessage } from './ChordProgressionGenerator';
import ChordSyntaxHelpModal from './ChordSyntaxHelpModal';

interface ChordProgressionFormProps {
  values: FormValues;
  onValueChange: <K extends keyof FormValues>(field: K, value: FormValues[K]) => void;
  onDownloadMidi: () => void;
  onCopyShareUrl: () => Promise<void>;
  onExportPdf: () => Promise<void>;
  status: StatusMessage;
  isGenerating: boolean;
  hasPreview: boolean;
}

const baseOctaveOptions = [
  { value: 2, label: '2 (Low)' },
  { value: 3, label: '3 (Medium-Low)' },
  { value: 4, label: '4 (Middle C Range)' },
  { value: 5, label: '5 (High)' },
];

const chordDurationOptions = ['0.25', '0.5', '0.75', '1', '1.5', '2', '4', '8', '12', '16'];

const outputTypeLabels: Record<OutputType, string> = {
  chordsOnly: 'Chords Only',
  chordsAndBass: 'Chords + Bass',
  bassOnly: 'Bass Only',
  bassAndFifth: 'Bass + Fifth (Power Chord)',
};

const inversionLabels: Record<InversionType, string> = {
  none: 'None (Root Position)',
  first: '1st Inversion',
  smooth: 'Smooth Voice Leading',
  pianist: 'Pianist',
  open: 'Open Voicing',
  spread: 'Spread Voicing',
  cocktail: 'Cocktail Voicing',
};

const statusToneToClass: Record<StatusMessage['tone'], string> = {
  muted: 'text-base-content/70',
  success: 'text-success',
  error: 'text-error',
};

const ChordProgressionForm: React.FC<ChordProgressionFormProps> = ({
  values,
  onValueChange,
  onDownloadMidi,
  onCopyShareUrl,
  onExportPdf,
  status,
  isGenerating,
  hasPreview,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [localVelocity, setLocalVelocity] = useState(values.velocity);

  useEffect(() => {
    setLocalVelocity(values.velocity);
  }, [values.velocity]);

  const handleVelocityCommit = () => {
    if (localVelocity !== values.velocity) {
      onValueChange('velocity', localVelocity);
    }
  };

  return (
    <div className="space-y-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Chord Progression</span>
        </label>
        <input
          type="text"
          className="input input-bordered block w-full"
          placeholder="C:1 G:0.5 Am F"
          value={values.progression}
          onChange={(event) => onValueChange('progression', event.target.value)}
        />
        <p className="text-xs text-base-content/70 mt-2 space-y-1">
          <span className="block">
            Separate chords with spaces. Add durations using <code className="font-mono">C:0.5</code> where the
            number is bars.
          </span>
          <span className="block">
            Slash chords set bass (<code className="font-mono">C/G</code>), <code className="font-mono">R:1</code> adds a
            rest, and <code className="font-mono">C1</code> forces a single-note root.
          </span>
          <button type="button" className="link link-primary text-xs" onClick={() => setShowInfo(true)}>
            Detailed chord &amp; duration help
          </button>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Output filename (.mid)</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={values.outputFileName}
            onChange={(event) => onValueChange('outputFileName', event.target.value)}
            placeholder="progression"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Tempo (BPM)</span>
          </label>
          <input
            type="number"
            min={20}
            max={300}
            className="input input-bordered w-full"
            value={values.tempo}
            onChange={(event) => onValueChange('tempo', Number(event.target.value))}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Base Octave</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={values.baseOctave}
            onChange={(event) => onValueChange('baseOctave', Number(event.target.value))}
          >
            {baseOctaveOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Default chord duration (bars)</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={values.chordDuration}
            onChange={(event) => onValueChange('chordDuration', event.target.value)}
          >
            {chordDurationOptions.map((duration) => (
              <option key={duration} value={duration}>
                {duration}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Output type</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={values.outputType}
            onChange={(event) => onValueChange('outputType', event.target.value as OutputType)}
          >
            {Object.entries(outputTypeLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Chord inversion</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={values.inversionType}
            onChange={(event) => onValueChange('inversionType', event.target.value as InversionType)}
          >
            {Object.entries(inversionLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Velocity ({localVelocity})</span>
        </label>
        <input
          type="range"
          min={1}
          max={127}
          className="range range-primary block w-full"
          value={localVelocity}
          onChange={(e) => setLocalVelocity(Number(e.target.value))}
          onMouseUp={handleVelocityCommit}
          onTouchEnd={handleVelocityCommit}
        />
      </div>

      <div className="space-y-2">
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={onDownloadMidi}
          disabled={isGenerating || values.progression.trim() === ''}
        >
          {isGenerating ? 'Generating…' : 'Download MIDI'}
        </button>
        <button type="button" className="btn btn-outline w-full" onClick={onCopyShareUrl}>
          Copy shareable URL
        </button>
        <button
          type="button"
          className="btn btn-outline w-full"
          onClick={onExportPdf}
          disabled={!hasPreview}
        >
          Export PDF
        </button>
        <p className={`text-sm ${statusToneToClass[status.tone]} text-center`}>{status.message}</p>
      </div>

      <ChordSyntaxHelpModal open={showInfo} onClose={() => setShowInfo(false)} />
    </div>
  );
};

export default ChordProgressionForm;
