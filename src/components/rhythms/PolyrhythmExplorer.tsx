import React, { useMemo, useState } from 'react';
import StepSequencer16 from '../StepSequencer16';
import { clampValue, generateEvenSteps, rotateSteps } from '../../lib/rhythms/patternUtils';

const TOTAL_STEPS = 16;

const PolyrhythmExplorer: React.FC = () => {
  const [numerator, setNumerator] = useState(3);
  const [denominator, setDenominator] = useState(2);
  const [numeratorRotation, setNumeratorRotation] = useState(0);
  const [denominatorRotation, setDenominatorRotation] = useState(0);

  const numeratorSteps = useMemo(() => {
    const base = generateEvenSteps(clampValue(numerator, 1, TOTAL_STEPS), TOTAL_STEPS);
    return rotateSteps(base, numeratorRotation, TOTAL_STEPS);
  }, [numerator, numeratorRotation]);

  const denominatorSteps = useMemo(() => {
    const base = generateEvenSteps(clampValue(denominator, 1, TOTAL_STEPS), TOTAL_STEPS);
    return rotateSteps(base, denominatorRotation, TOTAL_STEPS);
  }, [denominator, denominatorRotation]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-box border border-base-300/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-base-content/70">Upper voice</p>
          <label className="form-control w-full">
            <span className="label-text text-xs uppercase tracking-wide mb-1 block">Beats per bar</span>
            <input
              type="range"
              min={1}
              max={8}
              value={numerator}
              className="range range-xs"
              onChange={event => setNumerator(Number(event.target.value))}
            />
            <span className="text-xs font-mono text-right text-base-content/70 mt-1">{numerator}</span>
          </label>
          <label className="form-control w-full">
            <span className="label-text text-xs uppercase tracking-wide mb-1 block">Rotate</span>
            <input
              type="range"
              min={0}
              max={TOTAL_STEPS - 1}
              value={numeratorRotation}
              className="range range-xs"
              onChange={event => setNumeratorRotation(Number(event.target.value))}
            />
            <span className="text-xs font-mono text-right text-base-content/70 mt-1">
              {numeratorRotation} steps
            </span>
          </label>
        </div>
        <div className="space-y-3 rounded-box border border-base-300/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-base-content/70">Lower voice</p>
          <label className="form-control w-full">
            <span className="label-text text-xs uppercase tracking-wide mb-1 block">Beats per bar</span>
            <input
              type="range"
              min={1}
              max={8}
              value={denominator}
              className="range range-xs"
              onChange={event => setDenominator(Number(event.target.value))}
            />
            <span className="text-xs font-mono text-right text-base-content/70 mt-1">{denominator}</span>
          </label>
          <label className="form-control w-full">
            <span className="label-text text-xs uppercase tracking-wide mb-1 block">Rotate</span>
            <input
              type="range"
              min={0}
              max={TOTAL_STEPS - 1}
              value={denominatorRotation}
              className="range range-xs"
              onChange={event => setDenominatorRotation(Number(event.target.value))}
            />
            <span className="text-xs font-mono text-right text-base-content/70 mt-1">
              {denominatorRotation} steps
            </span>
          </label>
        </div>
      </div>
      <StepSequencer16
        title={`${numerator}:${denominator} Polyrhythm`}
        steps={numeratorSteps}
        secondarySteps={denominatorSteps}
        primaryInstrument="BD"
        secondaryInstrument="CH"
        bpm={120}
      />
      <p className="text-sm text-base-content/70">
        Pick any ratio to layer contrasting grids. Rotating either voice changes the accented downbeat without changing
        the density, perfect for call-and-response or modulation tricks.
      </p>
    </div>
  );
};

export default PolyrhythmExplorer;
