import React, { useMemo, useState } from 'react';
import StepSequencer16 from '../StepSequencer16';
import { buildMeterAnchors, rotateSteps } from '../../lib/rhythms/patternUtils';
import { RangeControl } from '../ui/RangeControl';

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
    <div className="card bg-base-100 shadow-xl border border-base-200">
      <div className="card-body space-y-4">
        <StepSequencer16
          title={`Polymeter ${primaryLength} vs ${secondaryLength}`}
          steps={primarySteps}
          secondarySteps={secondarySteps}
          primaryInstrument="BD"
          secondaryInstrument="SN"
          bpm={118}
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
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm font-medium">Meter A length</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={primaryLength}
                onChange={event => setPrimaryLength(Number(event.target.value))}
              >
                {LENGTH_OPTIONS.map(length => (
                  <option key={length} value={length}>
                    {length} steps
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm font-medium">Meter B length</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={secondaryLength}
                onChange={event => setSecondaryLength(Number(event.target.value))}
              >
                {LENGTH_OPTIONS.map(length => (
                  <option key={length} value={length}>
                    {length} steps
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <RangeControl
              label="Meter A Rotate"
              value={primaryRotation}
              min={0}
              max={gridSteps - 1}
              onChange={setPrimaryRotation}
              formatValue={(v) => `${v} steps`}
            />
            <RangeControl
              label="Meter B Rotate"
              value={secondaryRotation}
              min={0}
              max={gridSteps - 1}
              onChange={setSecondaryRotation}
              formatValue={(v) => `${v} steps`}
            />
          </div>
          <p className="text-sm text-base-content/70">
            Each loop keeps its own meter length while sharing the same tempo. Changing the grid lets you zoom in on
            different realignment points; offset either loop to create evolving metric tension without touching the BPM.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PolymeterExplorer;
