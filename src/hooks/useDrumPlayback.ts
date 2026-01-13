import { useCallback, useEffect, useRef, useState } from 'react';
import { SynthEngine } from '../lib/SynthEngine';
import { DrumSampler } from '../lib/drums/drumSampler';
import { GM_DRUM_MAP } from '../lib/drums/pocketOperations';

export type StepGrid = Record<string, number[]>;

const SAMPLED_ONLY_INSTRUMENTS = new Set(['LT', 'MT', 'HT']);

export interface UseDrumPlaybackOptions {
    /** The current grid of velocities per instrument */
    grid: StepGrid;
    /** Total number of steps in the pattern */
    totalSteps: number;
    /** Beats per minute */
    bpm: number;
    /** Instruments to play (in order) */
    visibleInstruments: string[];
}

export interface UseDrumPlaybackReturn {
    /** Whether playback is currently active */
    isPlaying: boolean;
    /** Current step index (0-based) */
    currentStep: number;
    /** Toggle play/pause */
    handlePlayPause: () => Promise<void>;
    /** Stop playback and reset to step 0 */
    handleStop: () => void;
    /** Preload samples for given instruments */
    preload: (instruments: string[]) => void;
    /** Status message for errors */
    status: string | null;
}

/**
 * Hook that manages drum pattern playback using SynthEngine and DrumSampler.
 */
export function useDrumPlayback(options: UseDrumPlaybackOptions): UseDrumPlaybackReturn {
    const { grid, totalSteps, bpm, visibleInstruments } = options;

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [status, setStatus] = useState<string | null>(null);

    const intervalRef = useRef<number | null>(null);
    const synthRef = useRef<SynthEngine | null>(null);
    const samplerRef = useRef<DrumSampler | null>(null);

    // Initialize synth and sampler on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        samplerRef.current = new DrumSampler();
        synthRef.current = new SynthEngine(0.42);

        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
            }
        };
    }, []);

    // Preload samples
    const preload = useCallback((instruments: string[]) => {
        samplerRef.current?.preload(instruments);
    }, []);

    // Auto-preload when visible instruments change
    useEffect(() => {
        preload(visibleInstruments);
    }, [visibleInstruments, preload]);

    // Calculate step duration in ms
    const stepMs = (60 / Math.max(1, bpm)) * 1000 / 4;

    // Play a single step
    const playStep = useCallback(
        (index: number) => {
            const synth = synthRef.current;
            const sampler = samplerRef.current;

            visibleInstruments.forEach((instrument) => {
                const velocities = grid[instrument];
                if (!velocities) return;
                const velocity = velocities[index];
                if (velocity > 0) {
                    const note = GM_DRUM_MAP[instrument as keyof typeof GM_DRUM_MAP];
                    if (sampler) {
                        sampler.play(instrument, velocity);
                    } else if (!SAMPLED_ONLY_INSTRUMENTS.has(instrument) && synth && note !== undefined) {
                        const normalizedVelocity = velocity / 127;
                        synth.playNote(note, 0.08, normalizedVelocity);
                    }
                }
            });
        },
        [grid, visibleInstruments]
    );

    // Manage playback interval
    useEffect(() => {
        if (!isPlaying || totalSteps <= 0) return;

        if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
        }

        intervalRef.current = window.setInterval(() => {
            setCurrentStep((prev) => {
                const next = (prev + 1) % totalSteps;
                playStep(next);
                return next;
            });
        }, stepMs);

        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isPlaying, playStep, stepMs, totalSteps]);

    const handlePlayPause = useCallback(async () => {
        if (!synthRef.current && !samplerRef.current) {
            setStatus('Audio is unavailable in this environment.');
            return;
        }

        const resumers: Promise<void>[] = [];
        if (samplerRef.current) resumers.push(samplerRef.current.ensureContextResumed());
        if (synthRef.current) resumers.push(synthRef.current.ensureContextResumed());
        await Promise.all(resumers);

        setIsPlaying((prev) => {
            if (prev) return false;
            playStep(0);
            setCurrentStep(0);
            return true;
        });
    }, [playStep]);

    const handleStop = useCallback(() => {
        setIsPlaying(false);
        setCurrentStep(0);
    }, []);

    return {
        isPlaying,
        currentStep,
        handlePlayPause,
        handleStop,
        preload,
        status,
    };
}
