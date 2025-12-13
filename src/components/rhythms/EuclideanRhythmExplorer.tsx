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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <label className="form-control w-32">
          <span className="label-text text-xs uppercase tracking-wide">Grid Size</span>
          <select
            className="select select-bordered select-sm mt-1"
            value={gridSteps}
            onChange={event => setGridSteps(Number(event.target.value))}
          >
            {GRID_OPTIONS.map(size => (
              <option key={size} value={size}>
                {size} steps
              </option>
            ))}
          </select>
        </label>
        <RangeControl
          label="Active Pulses"
          value={pulses}
          min={1}
          max={gridSteps}
          onChange={setPulses}
          className="w-48"
        />
        <RangeControl
          label="Rotate"
          value={rotation}
          min={0}
          max={gridSteps - 1}
          onChange={setRotation}
          formatValue={(v) => `${v} steps`}
          className="w-48"
        />
      </div>
      <StepSequencer16
        title={`E(${pulses}, ${gridSteps}) • rotate ${rotation}`}
        steps={rotatedPattern}
        primaryInstrument="BD"
        bpm={120}
        totalSteps={gridSteps}
      />
      <p className="text-sm text-base-content/70">
        Adjust the number of pulses and the rotation to hear how maximally even patterns morph from sparse
        clave-like tresillos into dense techno ostinatos. Changing the grid size lets you flip between 8-step
        and 16-step contexts without reprogramming the pattern.
      </p>
    </div>
  );
};

export default EuclideanRhythmExplorer;
