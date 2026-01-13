import React from 'react';
import { pocketLegend } from '../../lib/drums/pocketOperations';
import type { StepGrid } from '../../hooks/useDrumPlayback';

const NORMAL_VELOCITY = 110;

interface DrumStepGridProps {
    /** Current grid of velocities per instrument */
    grid: StepGrid;
    /** Instruments to display (in order) */
    visibleInstruments: string[];
    /** Total number of steps */
    totalSteps: number;
    /** Currently playing step (0-indexed) */
    currentStep: number;
    /** Whether playback is active */
    isPlaying: boolean;
    /** Callback when a step is toggled */
    onToggleStep: (instrument: string, index: number) => void;
}

/**
 * Presentational component for the drum step sequencer grid.
 * Each row is an instrument, each column is a 16th-note step.
 */
const DrumStepGrid: React.FC<DrumStepGridProps> = ({
    grid,
    visibleInstruments,
    totalSteps,
    currentStep,
    isPlaying,
    onToggleStep,
}) => {
    return (
        <div className="space-y-3">
            {visibleInstruments.map((instrument) => {
                const velocities = grid[instrument] ?? Array.from({ length: totalSteps }, () => 0);
                const label = pocketLegend[instrument as keyof typeof pocketLegend] ?? instrument;

                return (
                    <div key={instrument} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-base-content/80">
                            <span className="badge badge-outline badge-sm">{instrument}</span>
                            <span>{label}</span>
                        </div>
                        <div className="inline-grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-1 justify-start">
                            {velocities.map((vel, index) => {
                                const isCurrent = isPlaying && currentStep === index;
                                const isActive = vel > 0;
                                const isGhost = vel > 0 && vel < 90;

                                const base = 'btn btn-sm btn-square w-10 h-10 font-semibold transition-colors duration-150';
                                let activeClasses = 'border border-base-content/20 text-base-content/60 hover:bg-base-200 hover:text-base-content';
                                if (isActive) {
                                    activeClasses = isGhost
                                        ? 'bg-pink-200 text-pink-800 hover:bg-pink-300 border-pink-300'
                                        : 'btn-primary text-primary-content';
                                }

                                const indicator = isCurrent ? 'ring ring-secondary ring-offset-2 ring-offset-base-200' : '';

                                return (
                                    <button
                                        key={`${instrument}-${index}`}
                                        type="button"
                                        className={`${base} ${activeClasses} ${indicator}`}
                                        onClick={() => onToggleStep(instrument, index)}
                                        aria-pressed={isActive}
                                        aria-label={`Step ${index + 1} for ${instrument} (${isActive ? (isGhost ? 'Ghost' : 'Hit') : 'Off'})`}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DrumStepGrid;
