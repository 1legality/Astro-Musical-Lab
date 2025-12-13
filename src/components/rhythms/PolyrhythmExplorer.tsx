import React, { useMemo, useState } from 'react';
import StepSequencer16 from '../StepSequencer16';
import { clampValue, generateEvenSteps, rotateSteps } from '../../lib/rhythms/patternUtils';
import { RangeControl } from '../ui/RangeControl';

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
          <RangeControl
            label="Beats per bar"
            value={numerator}
            min={1}
            max={8}
            onChange={setNumerator}
          />
          <RangeControl
            label="Rotate"
            value={numeratorRotation}
            min={0}
            max={TOTAL_STEPS - 1}
            onChange={setNumeratorRotation}
            formatValue={(v) => `${v} steps`}
          />
        </div>
        <div className="space-y-3 rounded-box border border-base-300/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-base-content/70">Lower voice</p>
          <RangeControl
            label="Beats per bar"
            value={denominator}
            min={1}
            max={8}
            onChange={setDenominator}
          />
          <RangeControl
            label="Rotate"
            value={denominatorRotation}
            min={0}
            max={TOTAL_STEPS - 1}
            onChange={setDenominatorRotation}
            formatValue={(v) => `${v} steps`}
          />
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
