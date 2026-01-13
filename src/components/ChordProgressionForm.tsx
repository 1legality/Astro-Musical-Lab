import React, { useState } from 'react';
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
  { value: 3, label: '3 (Med-Low)' },
  { value: 4, label: '4 (Middle C)' },
  { value: 5, label: '5 (High)' },
];

const chordDurationOptions = ['0.25', '0.5', '0.75', '1', '1.5', '2', '4', '8', '12', '16'];

const outputTypeLabels: Record<OutputType, string> = {
  chordsOnly: 'Chords Only',
  chordsAndBass: 'Chords + Bass',
  bassOnly: 'Bass Only',
  bassAndFifth: 'Bass + Fifth',
};

const inversionLabels: Record<InversionType, string> = {
  none: 'Root Position',
  first: '1st Inversion',
  smooth: 'Smooth Voice Leading',
  pianist: 'Pianist',
  open: 'Open Voicing',
  spread: 'Spread Voicing',
  cocktail: 'Cocktail Voicing',
};

const statusToneToClass: Record<StatusMessage['tone'], string> = {
  muted: 'text-base-content/50 italic',
  success: 'text-success font-medium',
  error: 'text-error font-medium',
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

  return (
    <div className="space-y-5">
      {/* Progression Input - Full Width */}
      <label className="form-control w-full">
        <span className="label-text text-xs uppercase tracking-wide">Chord Progression</span>
        <input
          type="text"
          className="input input-bordered input-sm w-full mt-1"
          placeholder="C:1 G:0.5 Am F"
          value={values.progression}
          onChange={(event) => onValueChange('progression', event.target.value)}
        />
        <div className="text-xs text-base-content/60 mt-2 flex flex-wrap items-center gap-x-3">
          <span>
            Separate chords with spaces. Add durations: <code className="bg-base-300 rounded px-1 font-mono">C:0.5</code> (bars).
          </span>
          <button type="button" className="link link-primary text-xs" onClick={() => setShowInfo(true)}>
            Detailed syntax help
          </button>
        </div>
      </label>

      {/* Row 1: Filename + Tempo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="form-control">
          <span className="label-text text-xs uppercase tracking-wide mb-1">Filename</span>
          <input
            type="text"
            className="input input-bordered input-sm w-full"
            value={values.outputFileName}
            onChange={(event) => onValueChange('outputFileName', event.target.value)}
            placeholder="progression"
          />
        </label>

        <label className="form-control">
          <div className="flex justify-between items-center mb-1">
            <span className="label-text text-xs uppercase tracking-wide">Tempo</span>
            <span className="text-xs font-mono text-base-content/70">{values.tempo} BPM</span>
          </div>
          <input
            type="range"
            min={20}
            max={300}
            value={values.tempo}
            className="range range-xs"
            onChange={(event) => onValueChange('tempo', Number(event.target.value))}
          />
        </label>
      </div>

      {/* Row 2: All Selects */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <label className="form-control">
          <span className="label-text text-xs uppercase tracking-wide mb-1">Base Octave</span>
          <select
            className="select select-bordered select-sm w-full"
            value={values.baseOctave}
            onChange={(event) => onValueChange('baseOctave', Number(event.target.value))}
          >
            {baseOctaveOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span className="label-text text-xs uppercase tracking-wide mb-1">Duration</span>
          <select
            className="select select-bordered select-sm w-full"
            value={values.chordDuration}
            onChange={(event) => onValueChange('chordDuration', event.target.value)}
          >
            {chordDurationOptions.map((duration) => (
              <option key={duration} value={duration}>
                {duration} bar{duration !== '1' ? 's' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span className="label-text text-xs uppercase tracking-wide mb-1">Output</span>
          <select
            className="select select-bordered select-sm w-full"
            value={values.outputType}
            onChange={(event) => onValueChange('outputType', event.target.value as OutputType)}
          >
            {Object.entries(outputTypeLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span className="label-text text-xs uppercase tracking-wide mb-1">Voicing</span>
          <select
            className="select select-bordered select-sm w-full"
            value={values.inversionType}
            onChange={(event) => onValueChange('inversionType', event.target.value as InversionType)}
          >
            {Object.entries(inversionLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-base-content/10">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onDownloadMidi}
          disabled={isGenerating || values.progression.trim() === ''}
        >
          {isGenerating ? 'Generating…' : 'Download MIDI'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCopyShareUrl}>
          Copy URL
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onExportPdf}
          disabled={!hasPreview}
        >
          Export PDF
        </button>
        <span className={`text-xs ml-auto ${statusToneToClass[status.tone]}`}>{status.message}</span>
      </div>

      <ChordSyntaxHelpModal open={showInfo} onClose={() => setShowInfo(false)} />
    </div>
  );
};

export default ChordProgressionForm;
