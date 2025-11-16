import React, { useMemo } from 'react';
import { CHORD_FORMULAS, TPQN } from '../lib/chords/MidiGenerator';

interface ChordSyntaxHelpModalProps {
  open: boolean;
  onClose: () => void;
}

const durationRows = [
  { code: '0.25', desc: 'Quarter bar (sixteenth in 4/4)' },
  { code: '0.5', desc: 'Half bar (eighth in 4/4)' },
  { code: '0.75', desc: 'Three-quarter bar (dotted eighth)' },
  { code: '1', desc: 'One bar (quarter note)' },
  { code: '1.5', desc: 'One and a half bars (dotted quarter)' },
  { code: '2', desc: 'Two bars (half note)' },
  { code: '3', desc: 'Three bars (dotted half)' },
  { code: '4', desc: 'Four bars (whole note)' },
];

const tickRows = [
  { code: `T${TPQN / 4}`, desc: 'Sixteenth note' },
  { code: `T${TPQN / 2}`, desc: 'Eighth note' },
  { code: `T${TPQN}`, desc: 'Quarter note' },
  { code: `T${TPQN * 2}`, desc: 'Half note' },
  { code: `T${TPQN * 4}`, desc: 'Whole note' },
];

const ChordSyntaxHelpModal: React.FC<ChordSyntaxHelpModalProps> = ({ open, onClose }) => {
  const chordRows = useMemo(() => {
    return Object.entries(CHORD_FORMULAS).map(([quality, intervals]) => {
      const label = quality ? quality : 'Major';
      const friendlyLabel = quality === '1' ? 'Single Note (Root)' : label;
      return { label: friendlyLabel, intervals: intervals.join(', ') };
    });
  }, []);

  if (!open) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Chord &amp; Duration Help</h3>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <section className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold">Durations</h4>
            <p>Use decimal bars or absolute tick values for precise timing.</p>
            <div className="overflow-x-auto">
              <table className="table table-sm rounded-box border border-base-content/5 bg-base-100">
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
          </div>
          <div>
            <h4 className="font-semibold">Ticks</h4>
            <p>
              Prefix a numeric tick value with <code>T</code> (e.g., <code>{`T${TPQN}`}</code>) to bypass bar math.
            </p>
            <div className="overflow-x-auto">
              <table className="table table-sm rounded-box border border-base-content/5 bg-base-100">
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
          </div>
          <div>
            <h4 className="font-semibold">Rests &amp; Bass</h4>
            <p>
              Add rests via <code>R:duration</code>. Force bass notes with slash chords like <code>Am/E</code> or single
              notes like <code>C1</code>.
            </p>
          </div>
          <div>
            <h4 className="font-semibold">Recognized chord qualities</h4>
            <p>
              Format is <code>RootQuality</code>, e.g. <code>Cm7</code>, <code>F#sus2</code>, <code>Gmaj9</code>.
            </p>
            <div className="overflow-x-auto">
              <table className="table table-xs rounded-box border border-base-content/5 bg-base-100">
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
      <div className="modal-backdrop bg-black/70" onClick={onClose} />
    </div>
  );
};

export default ChordSyntaxHelpModal;
