import React, { useMemo, useState } from 'react';
import type { OutputType, InversionType } from '../lib/chords/MidiGenerator';
import { CHORD_FORMULAS, TPQN } from '../lib/chords/MidiGenerator';
import type { FormValues, StatusMessage } from './ChordProgressionGenerator';

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
  notesOnly: 'Note Grid (Custom)',
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
  const chordRows = useMemo(() => {
    return Object.entries(CHORD_FORMULAS).map(([quality, intervals]) => {
      const label = quality ? quality : 'Major';
      const friendlyLabel = quality === '1' ? 'Single Note (Root)' : label;
      return { label: friendlyLabel, intervals: intervals.join(', ') };
    });
  }, []);

  const durationRows = useMemo(
    () => [
      { code: '0.25', desc: 'Quarter of a bar (sixteenth in 4/4)' },
      { code: '0.5', desc: 'Half bar (eighth in 4/4)' },
      { code: '0.75', desc: 'Three quarter bar (dotted eighth)' },
      { code: '1', desc: 'One bar (quarter note in 4/4)' },
      { code: '1.5', desc: 'One and a half bars (dotted quarter)' },
      { code: '2', desc: 'Two bars (half note in 4/4)' },
      { code: '3', desc: 'Three bars (dotted half)' },
      { code: '4', desc: 'Four bars (whole note in 4/4)' },
    ],
    []
  );

  const tickRows = useMemo(
    () => [
      { code: `T${TPQN / 4}`, desc: 'Sixteenth note' },
      { code: `T${TPQN / 2}`, desc: 'Eighth note' },
      { code: `T${TPQN}`, desc: 'Quarter note' },
      { code: `T${TPQN * 2}`, desc: 'Half note' },
      { code: `T${TPQN * 4}`, desc: 'Whole note' },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Chord Progression</span>
        </label>
        <textarea
          className="textarea textarea-bordered h-28"
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
        <div className="alert alert-info mt-3 bg-info/10 border border-info/20 text-info-content">
          <div className="flex flex-col gap-1">
            <p className="font-semibold">💡 Quick Workflow</p>
            <p>
              Ask your favorite AI for a vibe or chord list, paste it here, choose options, and hit Download MIDI.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                className="btn btn-xs btn-outline"
                href="https://chatgpt.com/g/g-682e7b9f338881919be4abdc2900b752-chord-progression-generator"
                target="_blank"
                rel="noreferrer"
              >
                ChatGPT Generator
              </a>
              <a
                className="btn btn-xs btn-outline"
                href="https://gemini.google.com/gem/1mEp9hCTbbA9UybeB3l8-ZQEkzQKC1TXh?usp=sharing"
                target="_blank"
                rel="noreferrer"
              >
                Gemini Generator
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Output filename (.mid)</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
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
            className="input input-bordered"
            value={values.tempo}
            onChange={(event) => onValueChange('tempo', Number(event.target.value))}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Base Octave</span>
          </label>
          <select
            className="select select-bordered"
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
            className="select select-bordered"
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
            className="select select-bordered"
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
            className="select select-bordered"
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
          <span className="label-text font-semibold">
            Velocity (loudness): <span className="font-mono">{values.velocity}</span>
          </span>
        </label>
        <input
          type="range"
          min={1}
          max={127}
          value={values.velocity}
          onChange={(event) => onValueChange('velocity', Number(event.target.value))}
          className="range range-primary"
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

      {showInfo && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">Chord &amp; Duration Help</h3>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowInfo(false)}>
                ✕
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <section>
                <h4 className="font-semibold mb-1">Durations</h4>
                <p>Use decimal bars or absolute tick values (<code>T128</code> etc.).</p>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {durationRows.map((row) => (
                        <tr key={row.code}>
                          <td>
                            <code>{row.code}</code>
                          </td>
                          <td>{row.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="overflow-x-auto mt-2">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Tick Code</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickRows.map((row) => (
                        <tr key={row.code}>
                          <td>
                            <code>{row.code}</code>
                          </td>
                          <td>{row.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="space-y-2">
                <div>
                  <h4 className="font-semibold">Rests &amp; Bass</h4>
                  <p>
                    Add rests via <code>R:duration</code>. Force bass notes with slash chords like{' '}
                    <code>Am/E</code>.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">Recognized chord qualities</h4>
                  <p>
                    Format is <code>RootQuality</code>, e.g. <code>Cm7</code>, <code>F#sus2</code>, <code>Gmaj9</code>.
                  </p>
                  <div className="overflow-x-auto max-h-72">
                    <table className="table table-xs">
                      <thead>
                        <tr>
                          <th>Quality</th>
                          <th>Intervals (semitones)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chordRows.map((row) => (
                          <tr key={row.label}>
                            <td className="font-medium">{row.label}</td>
                            <td>{row.intervals}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          </div>
          <div className="modal-backdrop bg-black/70" onClick={() => setShowInfo(false)} />
        </div>
      )}
    </div>
  );
};

export default ChordProgressionForm;
