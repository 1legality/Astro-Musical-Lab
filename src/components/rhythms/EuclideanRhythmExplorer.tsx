import React, { useEffect, useMemo, useState } from 'react';
import StepSequencer16 from '../StepSequencer16';
import { clampValue, generateEvenSteps, rotateSteps } from '../../lib/rhythms/patternUtils';
import { RangeControl } from '../ui/RangeControl';

const GRID_OPTIONS = [8, 12, 16];

const EuclideanRhythmExplorer: React.FC = () => {
  const [gridSteps, setGridSteps] = useState(16);
  const [pulses, setPulses] = useState(5);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setPulses(prev => clampValue(prev, 1, gridSteps));
    setRotation(prev => clampValue(prev, 0, gridSteps - 1));
  }, [gridSteps]);

  const basePattern = useMemo(
    () => generateEvenSteps(pulses, gridSteps),
    [pulses, gridSteps],
  );

  const rotatedPattern = useMemo(
    () => rotateSteps(basePattern, rotation, gridSteps),
    [basePattern, rotation, gridSteps],
  );

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200">
      <div className="card-body space-y-4">
        <StepSequencer16
          title={`E(${pulses}, ${gridSteps}) • rotate ${rotation}`}
          steps={rotatedPattern}
          primaryInstrument="BD"
          bpm={120}
          totalSteps={gridSteps}
        />
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm font-medium">Grid Size</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={gridSteps}
                onChange={event => setGridSteps(Number(event.target.value))}
              >
                {GRID_OPTIONS.map(size => (
                  <option key={size} value={size}>
                    {size} steps
                  </option>
                ))}
              </select>
            </div>
            <RangeControl
              label="Active Pulses"
              value={pulses}
              min={1}
              max={gridSteps}
              onChange={setPulses}
              className="w-full"
            />
            <RangeControl
              label="Rotate"
              value={rotation}
              min={0}
              max={gridSteps - 1}
              onChange={setRotation}
              formatValue={(v) => `${v} steps`}
              className="w-full"
            />
          </div>
          <p className="text-sm text-base-content/70">
            Adjust the number of pulses and the rotation to hear how maximally even patterns morph from sparse
            clave-like tresillos into dense techno ostinatos. Changing the grid size lets you flip between 8-step
            and 16-step contexts without reprogramming the pattern.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EuclideanRhythmExplorer;
