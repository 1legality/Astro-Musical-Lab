import React from 'react';
import { pocketLegend } from '../../lib/drums/pocketOperations';
import type { StepGrid } from '../../hooks/useDrumPlayback';

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
 * Styled to match Pulse Generator aesthetic.
 */
const DrumStepGrid: React.FC<DrumStepGridProps> = ({
    grid,
    visibleInstruments,
    totalSteps,
    currentStep,
    isPlaying,
    onToggleStep,
}) => {
    const stepGroups = Math.ceil(totalSteps / 4);

    return (
        <div className="space-y-4">
            {visibleInstruments.map((instrument) => {
                const velocities = grid[instrument] ?? Array.from({ length: totalSteps }, () => 0);
                const label = pocketLegend[instrument as keyof typeof pocketLegend] ?? instrument;

                return (
                    <div key={instrument} className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wide font-semibold text-base-content/80">
                                {instrument}
                            </span>
                            <span className="text-xs text-base-content/50">{label}</span>
                        </div>
                        <div className="flex w-full gap-x-2 sm:gap-x-4">
                            {Array.from({ length: stepGroups }).map((_, groupIndex) => (
                                <div key={groupIndex} className="flex flex-1 gap-1">
                                    {Array.from({ length: 4 }).map((_, stepIndex) => {
                                        const index = groupIndex * 4 + stepIndex;
                                        if (index >= totalSteps) return null;

                                        const vel = velocities[index];
                                        const isCurrent = isPlaying && currentStep === index;
                                        const isActive = vel > 0;
                                        const isGhost = vel > 0 && vel < 90;

                                        const baseClasses = 'flex-1 aspect-square min-w-[32px] rounded-md border text-xs font-mono flex items-center justify-center cursor-pointer transition-colors';
                                        let colorClasses = 'border-base-300 text-base-content/50 bg-base-100/50 hover:bg-base-200';

                                        if (isActive) {
                                            colorClasses = isGhost
                                                ? 'border-warning/60 text-warning bg-warning/10 hover:bg-warning/20'
                                                : 'border-primary/70 text-primary bg-primary/10 hover:bg-primary/20';
                                        }

                                        const indicator = isCurrent ? 'ring ring-secondary ring-offset-2 ring-offset-base-200' : '';

                                        return (
                                            <button
                                                key={index}
                                                type="button"
                                                className={`${baseClasses} ${colorClasses} ${indicator}`}
                                                onClick={() => onToggleStep(instrument, index)}
                                                aria-pressed={isActive}
                                                aria-label={`Step ${index + 1} for ${instrument} (${isActive ? (isGhost ? 'Ghost' : 'Hit') : 'Off'})`}
                                            >
                                                {index + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
            <div className="text-xs text-base-content/70">
                Click pads to cycle: Hit (blue) → Ghost (amber) → Off
            </div>
        </div>
    );
};

export default DrumStepGrid;
