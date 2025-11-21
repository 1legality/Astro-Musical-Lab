
import React, { useState, useEffect, useRef } from 'react';
import { DrumSampler } from '../lib/drums/drumSampler';

interface StepSequencer16Props {
  title?: string;
  steps?: number[];
  secondarySteps?: number[];
  primaryInstrument?: string;
  secondaryInstrument?: string;
  bpm?: number;
  duration?: number;
  totalSteps?: number;
  client?: 'load' | 'idle' | 'visible' | 'media' | 'only';
}

const clampStep = (step: number, max: number) => {
  if (max <= 0) return 0;
  const normalized = ((step - 1) % max + max) % max;
  return normalized;
};

const createActiveArray = (length: number, indices: number[]) => {
  const arr = Array(Math.max(1, length)).fill(false);
  indices.forEach(step => {
    const normalized = clampStep(step, arr.length);
    arr[normalized] = true;
  });
  return arr;
};

const StepSequencer16: React.FC<StepSequencer16Props> = ({
  title,
  steps = [],
  secondarySteps = [],
  primaryInstrument = 'BD',
  secondaryInstrument = 'CH',
  bpm = 120,
  duration = 0.06,
  totalSteps = 16,
}) => {
  const [activeSteps, setActiveSteps] = useState<boolean[]>(() =>
    createActiveArray(totalSteps, steps),
  );

  const [activeSecondarySteps, setSecondaryActiveSteps] = useState<boolean[]>(() =>
    createActiveArray(totalSteps, secondarySteps),
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const samplerRef = useRef<DrumSampler | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      samplerRef.current = new DrumSampler();
    }
  }, []);

  useEffect(() => {
    samplerRef.current?.preload([primaryInstrument, secondaryInstrument].filter(Boolean));
  }, [primaryInstrument, secondaryInstrument]);

  const stepTime = (60 / bpm) / 4 * 1000; // Time per 16th note in ms

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1);
          if (nextStep >= totalSteps) {
            if (isLooping) {
              return 0;
            } else {
              setIsPlaying(false);
              return Math.max(0, totalSteps - 1); // Stay on last step
            }
          }
          return nextStep;
        });
      }, stepTime);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isLooping, stepTime, totalSteps]);

  useEffect(() => {
    if (isPlaying) {
      if (activeSteps[currentStep]) {
        samplerRef.current?.play(primaryInstrument);
      }
      if (activeSecondarySteps[currentStep]) {
        samplerRef.current?.play(secondaryInstrument);
      }
    }
  }, [currentStep, isPlaying, activeSteps, activeSecondarySteps, primaryInstrument, secondaryInstrument, duration]);

  const handlePlay = async () => {
    if (samplerRef.current) {
      await samplerRef.current.ensureContextResumed();
    }
    if (!isPlaying) {
        setCurrentStep(-1); // Reset to start on play
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    if (samplerRef.current) {
      samplerRef.current.dispose();
      samplerRef.current = new DrumSampler();
      samplerRef.current.preload([primaryInstrument, secondaryInstrument].filter(Boolean));
    }
  };

  const toggleStep = (index: number, isSecondary = false) => {
    if (isSecondary) {
        const newSteps = [...activeSecondarySteps];
        newSteps[index] = !newSteps[index];
        setSecondaryActiveSteps(newSteps);
    } else {
        const newSteps = [...activeSteps];
        newSteps[index] = !newSteps[index];
        setActiveSteps(newSteps);
    }
  };

  const primarySignature = steps.join(',');
  const secondarySignature = secondarySteps.join(',');

  useEffect(() => {
    setActiveSteps(createActiveArray(totalSteps, steps));
  }, [primarySignature, totalSteps]);

  useEffect(() => {
    setSecondaryActiveSteps(createActiveArray(totalSteps, secondarySteps));
  }, [secondarySignature, totalSteps]);

  useEffect(() => {
    setCurrentStep(prev => Math.min(prev, Math.max(0, totalSteps - 1)));
  }, [totalSteps]);

  const groups = Math.ceil(totalSteps / 4);

  return (
    <div className="card bg-base-200/70 w-fit">
      <div className="card-body space-y-4">
        {title && (
          <h3 className="card-title text-sm font-semibold uppercase tracking-wide mt-0">
            {title}
          </h3>
        )}
        <div className="flex flex-wrap justify-start gap-x-4 gap-y-2">
          {Array.from({ length: groups }).map((_, groupIndex) => (
            <div key={groupIndex} className="flex gap-1">
              {Array.from({ length: 4 }).map((_, itemIndex) => {
                const i = groupIndex * 4 + itemIndex;
                if (i >= totalSteps) {
                  return null;
                }
                const isA = activeSteps[i];
                const isB = activeSecondarySteps[i];
                const both = isA && isB;
                const isCurrent = isPlaying && currentStep === i;

                const baseClasses =
                  'btn btn-square font-semibold select-none transition-colors duration-150';
                let colorClasses =
                  'btn-outline btn-neutral text-base-content/70 border-base-300 bg-base-100/40 hover:text-base-content';
                if (both) {
                  colorClasses = 'btn-accent text-accent-content';
                } else if (isA) {
                  colorClasses = 'btn-primary text-primary-content';
                } else if (isB) {
                  colorClasses = 'btn-warning text-warning-content';
                }

                const indicator = isCurrent
                  ? 'ring ring-offset-2 ring-offset-base-200 ring-secondary'
                  : '';

                return (
                  <button
                    key={i}
                    type="button"
                    className={`${baseClasses} ${colorClasses} ${indicator}`}
                    onClick={() => toggleStep(i)}
                  >
                    <span className="text-sm leading-none">{i + 1}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handlePlay} className="btn btn-primary btn-sm">
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={handleStop} className="btn btn-error btn-sm">
            Stop
          </button>
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`btn btn-sm ${isLooping ? 'btn-secondary' : 'btn-outline btn-secondary'}`}
          >
            {isLooping ? 'Loop On' : 'Loop Off'}
          </button>
          <div className="badge badge-outline badge-lg font-mono gap-1">
            {bpm} BPM <span>•</span> 16th = {(60 / bpm / 4).toFixed(3)}s
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepSequencer16;
