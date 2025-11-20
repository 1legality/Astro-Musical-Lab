import React, { useMemo, useState } from 'react';
import StepSequencer16 from '../StepSequencer16';
import { buildMeterAnchors, rotateSteps } from '../../lib/rhythms/patternUtils';

const LENGTH_OPTIONS = [3, 4, 5, 6, 7, 8];
const GRID_OPTIONS = [16, 20];

const PolymeterExplorer: React.FC = () => {
  const [gridSteps, setGridSteps] = useState(16);
  const [primaryLength, setPrimaryLength] = useState(4);
  const [secondaryLength, setSecondaryLength] = useState(5);
  const [primaryRotation, setPrimaryRotation] = useState(0);
  const [secondaryRotation, setSecondaryRotation] = useState(0);

  const primarySteps = useMemo(() => {
    const anchors = buildMeterAnchors(primaryLength, gridSteps);
    return rotateSteps(anchors, primaryRotation, gridSteps);
  }, [primaryLength, primaryRotation, gridSteps]);

  const secondarySteps = useMemo(() => {
    const anchors = buildMeterAnchors(secondaryLength, gridSteps);
    return rotateSteps(anchors, secondaryRotation, gridSteps);
  }, [secondaryLength, secondaryRotation, gridSteps]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <label className="form-control w-32">
          <span className="label-text text-xs uppercase tracking-wide">Grid Size</span>
          <select
            className="select select-bordered select-sm mt-1"
            value={gridSteps}
            onChange={event => {
              setGridSteps(Number(event.target.value));
              setPrimaryRotation(0);
              setSecondaryRotation(0);
            }}
          >
            {GRID_OPTIONS.map(size => (
              <option key={size} value={size}>
                {size} steps
              </option>
            ))}
          </select>
        </label>
        <label className="form-control w-44">
          <span className="label-text text-xs uppercase tracking-wide">Meter A length</span>
          <select
            className="select select-bordered select-sm mt-1"
            value={primaryLength}
            onChange={event => setPrimaryLength(Number(event.target.value))}
          >
            {LENGTH_OPTIONS.map(length => (
              <option key={length} value={length}>
                {length} steps
              </option>
            ))}
          </select>
        </label>
        <label className="form-control w-44">
          <span className="label-text text-xs uppercase tracking-wide">Meter B length</span>
          <select
            className="select select-bordered select-sm mt-1"
            value={secondaryLength}
            onChange={event => setSecondaryLength(Number(event.target.value))}
          >
            {LENGTH_OPTIONS.map(length => (
              <option key={length} value={length}>
                {length} steps
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="form-control w-full">
          <span className="label-text text-xs uppercase tracking-wide mb-1 block">Meter A Rotate</span>
          <input
            type="range"
            min={0}
            max={gridSteps - 1}
            value={primaryRotation}
            className="range range-xs"
            onChange={event => setPrimaryRotation(Number(event.target.value))}
          />
          <span className="text-xs font-mono text-right text-base-content/70 mt-1">{primaryRotation} steps</span>
        </label>
        <label className="form-control w-full">
          <span className="label-text text-xs uppercase tracking-wide mb-1 block">Meter B Rotate</span>
          <input
            type="range"
            min={0}
            max={gridSteps - 1}
            value={secondaryRotation}
            className="range range-xs"
            onChange={event => setSecondaryRotation(Number(event.target.value))}
          />
          <span className="text-xs font-mono text-right text-base-content/70 mt-1">{secondaryRotation} steps</span>
        </label>
      </div>
      <StepSequencer16
        title={`Polymeter ${primaryLength} vs ${secondaryLength}`}
        steps={primarySteps}
        secondarySteps={secondarySteps}
        note={55}
        secondaryNote={67}
        bpm={118}
        totalSteps={gridSteps}
      />
      <p className="text-sm text-base-content/70">
        Each loop keeps its own meter length while sharing the same tempo. Changing the grid lets you zoom in on
        different realignment points; offset either loop to create evolving metric tension without touching the BPM.
      </p>
    </div>
  );
};

export default PolymeterExplorer;
