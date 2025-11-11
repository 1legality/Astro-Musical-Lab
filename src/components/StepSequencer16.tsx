
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
    <div className="w-full bg-zinc-800/50 rounded-lg border border-zinc-700 p-4 shadow-sm">
      {title && <h3 className="text-sm font-semibold text-zinc-200 mb-3">{title}</h3>}
      <div className="relative mb-3">
        <div className="grid grid-cols-16 gap-1">
          {Array.from({ length: 16 }).map((_, i) => {
            const isA = activeSteps[i];
            const isB = activeSecondarySteps[i];
            const both = isA && isB;
            const isCurrent = isPlaying && currentStep === i;
            
            let baseClasses = 'relative flex items-center justify-center w-full aspect-square select-none rounded-sm border cursor-pointer transition-colors';
            let colorClasses = both ? 'bg-fuchsia-500/80 border-fuchsia-400 text-white' : isA ? 'bg-sky-500/80 border-sky-400 text-white' : isB ? 'bg-amber-500/80 border-amber-400 text-white' : 'bg-zinc-700/50 border-zinc-600/80 text-zinc-400';
            if (isCurrent) {
                colorClasses = 'ring-2 ring-offset-2 ring-offset-zinc-800 ring-green-400';
            }

            return (
              <div key={i} className={`${baseClasses} ${colorClasses}`} onClick={() => toggleStep(i)}>
                <span className="text-[10px] leading-none">{i + 1}</span>
              </div>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 bottom-0 w-px bg-zinc-600/70" style={{ left: '25%' }}></div>
          <div className="absolute top-0 bottom-0 w-px bg-zinc-600/70" style={{ left: '50%' }}></div>
          <div className="absolute top-0 bottom-0 w-px bg-zinc-600/70" style={{ left: '75%' }}></div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handlePlay} className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded">{isPlaying ? 'Pause' : 'Play'}</button>
        <button onClick={handleStop} className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded">Stop</button>
        <button onClick={() => setIsLooping(!isLooping)} className={`${isLooping ? 'bg-indigo-600' : 'bg-gray-500'} hover:bg-indigo-700 text-white text-sm py-1 px-3 rounded`}>
          {isLooping ? 'Loop On' : 'Loop Off'}
        </button>
        <div className="ml-3 text-xs text-zinc-400">{bpm} BPM • 16th = {(60 / bpm / 4).toFixed(3)}s</div>
      </div>
      <style>{`.grid-cols-16 { grid-template-columns: repeat(16, minmax(0, 1fr)); }`}</style>
    </div>
  );
};

export default StepSequencer16;
