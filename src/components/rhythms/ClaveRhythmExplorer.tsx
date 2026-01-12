import React, { useMemo, useState } from 'react';
import StepSequencer16 from '../StepSequencer16';
import { rotateSteps } from '../../lib/rhythms/patternUtils';
import { RangeControl } from '../ui/RangeControl';

const CLAVE_PATTERNS = [
  {
    id: 'son-32',
    label: 'Son Clave 3-2',
    description: 'Straight feel; classic salsa backbone.',
    steps: [1, 4, 7, 11, 13],
  },
  {
    id: 'son-23',
    label: 'Son Clave 2-3',
    description: 'Same hits flipped—use to release the tension.',
    steps: [9, 12, 15, 3, 5],
  },
  {
    id: 'rumba-32',
    label: 'Rumba Clave 3-2',
    description: 'Third hit slides late for a rolling swing.',
    steps: [1, 4, 8, 11, 13],
  },
  {
    id: 'rumba-23',
    label: 'Rumba Clave 2-3',
    description: 'Flip of the rumba feel.',
    steps: [9, 13, 1, 4, 8],
  },
  {
    id: 'tresillo',
    label: 'Tresillo Loop',
    description: 'Three-over-two anchor that repeats twice per bar.',
    steps: [1, 4, 7, 9, 12, 15],
  },
];

const ClaveRhythmExplorer: React.FC = () => {
  const [patternId, setPatternId] = useState(CLAVE_PATTERNS[0].id);
  const [rotation, setRotation] = useState(0);

  const selectedPattern = useMemo(
    () => CLAVE_PATTERNS.find(pattern => pattern.id === patternId) ?? CLAVE_PATTERNS[0],
    [patternId],
  );

  const rotatedSteps = useMemo(
    () => rotateSteps(selectedPattern.steps, rotation, 16),
    [selectedPattern.steps, rotation],
  );

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200">
      <div className="card-body space-y-4">
        <StepSequencer16
          title={`${selectedPattern.label} • rotate ${rotation}`}
          steps={rotatedSteps}
          primaryInstrument="RS"
          bpm={110}
        />

        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm font-medium">Pattern</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={patternId}
                onChange={event => setPatternId(event.target.value)}
              >
                {CLAVE_PATTERNS.map(pattern => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.label}
                  </option>
                ))}
              </select>
            </div>
            <RangeControl
              label="Rotate"
              value={rotation}
              min={0}
              max={15}
              onChange={setRotation}
              formatValue={(v) => `${v} steps`}
              className="w-full"
            />
          </div>
          <p className="text-sm text-base-content/70">{selectedPattern.description}</p>
        </div>
      </div>
    </div>
  );
};

export default ClaveRhythmExplorer;
