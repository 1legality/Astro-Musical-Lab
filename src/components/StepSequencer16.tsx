
import React, { useState, useEffect, useRef } from 'react';
import { SynthEngine } from '../lib/SynthEngine';

interface StepSequencer16Props {
  title?: string;
  steps?: number[];
  secondarySteps?: number[];
  note?: number;
  secondaryNote?: number;
  bpm?: number;
  duration?: number;
  client: "load" | "idle" | "visible" | "media" | "only";
}

const StepSequencer16: React.FC<StepSequencer16Props> = ({
  title,
  steps = [],
  secondarySteps = [],
  note = 60,
  secondaryNote = 67,
  bpm = 120,
  duration = 0.06,
}) => {
  const [activeSteps, setActiveSteps] = useState<boolean[]>(() => {
    const initial = Array(16).fill(false);
    steps.forEach(s => {
      if (s > 0 && s <= 16) initial[s - 1] = true;
    });
    return initial;
  });

  const [activeSecondarySteps, setSecondaryActiveSteps] = useState<boolean[]>(() => {
    const initial = Array(16).fill(false);
    secondarySteps.forEach(s => {
      if (s > 0 && s <= 16) initial[s - 1] = true;
    });
    return initial;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const synthEngineRef = useRef<SynthEngine | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthEngineRef.current = new SynthEngine();
    }
  }, []);

  const stepTime = (60 / bpm) / 4 * 1000; // Time per 16th note in ms

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1);
          if (nextStep >= 16) {
            if (isLooping) {
              return 0;
            } else {
              setIsPlaying(false);
              return 15; // Stay on last step
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
  }, [isPlaying, isLooping, stepTime]);

  useEffect(() => {
    if (isPlaying) {
      const notesToPlay: number[] = [];
      if (activeSteps[currentStep]) {
        notesToPlay.push(note);
      }
      if (activeSecondarySteps[currentStep]) {
        notesToPlay.push(secondaryNote);
      }
      if (notesToPlay.length > 0 && synthEngineRef.current) {
        synthEngineRef.current.playChord(notesToPlay, duration);
      }
    }
  }, [currentStep, isPlaying, activeSteps, activeSecondarySteps, note, secondaryNote, duration]);

  const handlePlay = async () => {
    if (synthEngineRef.current) {
      await synthEngineRef.current.ensureContextResumed();
    }
    if (!isPlaying) {
        setCurrentStep(-1); // Reset to start on play
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    if (synthEngineRef.current) {
      synthEngineRef.current.stopAll();
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

  return (
    <div className="card bg-base-200/70 border border-base-300 shadow-xl">
      <div className="card-body space-y-4">
        {title && <h3 className="card-title text-sm font-semibold uppercase tracking-wide">{title}</h3>}
        <div className="relative">
          <div className="grid grid-cols-16 gap-1">
            {Array.from({ length: 16 }).map((_, i) => {
              const isA = activeSteps[i];
              const isB = activeSecondarySteps[i];
              const both = isA && isB;
              const isCurrent = isPlaying && currentStep === i;

              const baseClasses =
                'btn btn-square btn-xs font-semibold select-none transition-colors duration-150';
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
                  <span className="text-[10px] leading-none">{i + 1}</span>
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute top-0 bottom-0 w-px bg-base-300" style={{ left: '25%' }}></div>
            <div className="absolute top-0 bottom-0 w-px bg-base-300" style={{ left: '50%' }}></div>
            <div className="absolute top-0 bottom-0 w-px bg-base-300" style={{ left: '75%' }}></div>
          </div>
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
      <style>{`.grid-cols-16 { grid-template-columns: repeat(16, minmax(0, 1fr)); }`}</style>
    </div>
  );
};

export default StepSequencer16;
