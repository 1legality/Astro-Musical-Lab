import { useCallback, useEffect, useRef, useState } from 'react';
import type { MidiGenerationResult, ChordGenerationData, OutputType } from '../lib/chords/MidiGenerator';
import { TPQN } from '../lib/chords/MidiGenerator';
import { SynthChordPlayer, type ActiveNote } from '../lib/chords/SynthChordPlayer';
import { midiService } from '../lib/chords/MidiService';

interface ScheduleItem {
    notes: number[];
    durationSec: number;
    label: string;
}

function getNotesForOutputType(chord: ChordGenerationData, outputType: OutputType): number[] {
    if (!chord.isValid) return [];
    switch (outputType) {
        case 'chordsOnly':
            return [...(chord.adjustedVoicing || [])];
        case 'chordsAndBass': {
            const notes = [...(chord.adjustedVoicing || [])];
            if (typeof chord.calculatedBassNote === 'number' && !notes.includes(chord.calculatedBassNote)) {
                notes.push(chord.calculatedBassNote);
            }
            return notes;
        }
        case 'bassOnly':
            return typeof chord.calculatedBassNote === 'number' ? [chord.calculatedBassNote] : [];
        case 'bassAndFifth':
            if (typeof chord.calculatedBassNote !== 'number') return [];
            const fifth = chord.calculatedBassNote + 7;
            return fifth >= 0 && fifth <= 127 ? [chord.calculatedBassNote, fifth] : [chord.calculatedBassNote];
        default:
            return [];
    }
}

function buildSchedule(result: MidiGenerationResult | null, outputType: OutputType, tempo: number): ScheduleItem[] {
    if (!result || !result.chordDetails?.length) return [];
    const secPerTick = 60 / (Math.max(tempo, 1) * TPQN);

    return result.chordDetails
        .map((chord) => {
            const durationSec = Math.max(0, chord.durationTicks) * secPerTick;
            const notes = getNotesForOutputType(chord, outputType);
            return { notes, durationSec, label: chord.symbol || 'Chord' };
        })
        .filter((item) => item.durationSec > 0);
}

export interface UseChordPlaybackOptions {
    /** The generation result containing chord details */
    generation: MidiGenerationResult | null;
    /** Output type (chordsOnly, chordsAndBass, etc.) */
    outputType: OutputType;
    /** Tempo in BPM */
    tempo: number;
    /** Optional MIDI output device ID */
    midiOutputId?: string;
    /** MIDI channel (0 = omni) */
    midiChannel?: number;
}

export interface UseChordPlaybackReturn {
    /** Whether the loop is currently playing */
    isLooping: boolean;
    /** Current chord indicator text */
    chordIndicator: string;
    /** Playback progress from 0 to 1 */
    playbackProgress: number;
    /** Start the chord progression loop */
    startLoop: () => Promise<void>;
    /** Stop the loop */
    stopLoop: () => void;
    /** Reference to the synth (for external chord preview) */
    synth: SynthChordPlayer | null;
    /** Set chord indicator text */
    setChordIndicator: (text: string) => void;
}

/**
 * Hook for managing chord progression loop playback.
 */
export function useChordPlayback(options: UseChordPlaybackOptions): UseChordPlaybackReturn {
    const { generation, outputType, tempo, midiOutputId, midiChannel = 0 } = options;

    const [isLooping, setIsLooping] = useState(false);
    const [chordIndicator, setChordIndicator] = useState('Click a chord button to play it.');
    const [playbackProgress, setPlaybackProgress] = useState(0);

    const synthRef = useRef<SynthChordPlayer | null>(null);
    const playbackTimeoutRef = useRef<number | null>(null);
    const playbackNotesRef = useRef<ActiveNote[] | null>(null);
    const playbackIndexRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    const chordStartTimeRef = useRef<number>(0);
    const scheduleRef = useRef<ScheduleItem[]>([]);
    const totalDurationRef = useRef<number>(0);
    const isLoopingRef = useRef(false);

    // Initialize synth on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        synthRef.current = new SynthChordPlayer(0.45);

        return () => {
            synthRef.current?.stopNotes();
        };
    }, []);

    // Keep ref in sync with state
    useEffect(() => {
        isLoopingRef.current = isLooping;
    }, [isLooping]);

    const stopLoop = useCallback(() => {
        setIsLooping(false);
        isLoopingRef.current = false;

        if (playbackTimeoutRef.current !== null) {
            clearTimeout(playbackTimeoutRef.current);
            playbackTimeoutRef.current = null;
        }

        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (playbackNotesRef.current && synthRef.current) {
            synthRef.current.stopNotes(playbackNotesRef.current);
            playbackNotesRef.current = null;
        }

        setPlaybackProgress(0);
        setChordIndicator('Click a chord button to play it.');
    }, []);

    const startLoop = useCallback(async () => {
        if (isLooping) return;

        const schedule = buildSchedule(generation, outputType, tempo);
        if (!schedule.length) {
            return;
        }

        const synth = synthRef.current;
        if (!synth) {
            return;
        }

        await synth.ensureContextResumed();
        setIsLooping(true);
        isLoopingRef.current = true;
        playbackIndexRef.current = 0;

        // Store schedule info for progress calculation
        scheduleRef.current = schedule;
        totalDurationRef.current = schedule.reduce((sum, item) => sum + item.durationSec, 0);

        // Animation loop for smooth playhead
        const animatePlayhead = () => {
            if (!isLoopingRef.current) return;

            const now = performance.now();
            const elapsed = (now - chordStartTimeRef.current) / 1000;
            const currentChordDuration = scheduleRef.current[playbackIndexRef.current]?.durationSec || 0;

            // Calculate time offset for current chord within total duration
            let timeOffset = 0;
            for (let i = 0; i < playbackIndexRef.current; i++) {
                timeOffset += scheduleRef.current[i].durationSec;
            }

            const currentProgress = (timeOffset + Math.min(elapsed, currentChordDuration)) / totalDurationRef.current;
            setPlaybackProgress(Math.min(1, Math.max(0, currentProgress)));

            animationFrameRef.current = requestAnimationFrame(animatePlayhead);
        };

        const advance = () => {
            if (!synthRef.current) return;
            if (!isLoopingRef.current) return;

            const item = schedule[playbackIndexRef.current];
            chordStartTimeRef.current = performance.now();

            if (playbackNotesRef.current) {
                synthRef.current.stopNotes(playbackNotesRef.current);
                playbackNotesRef.current = null;
            }

            if (item.notes.length > 0) {
                playbackNotesRef.current = synthRef.current.startChord(item.notes);

                if (midiOutputId) {
                    midiService.sendChordOn(midiOutputId, item.notes, 0x7f, midiChannel - 1);
                }

                setChordIndicator(`Playing: ${item.label}`);
            } else {
                setChordIndicator('Rest');
            }

            const nextDelay = Math.max(10, item.durationSec * 1000);
            playbackTimeoutRef.current = window.setTimeout(() => {
                if (midiOutputId && item.notes.length > 0) {
                    midiService.sendChordOff(midiOutputId, item.notes, midiChannel - 1);
                }

                playbackIndexRef.current = (playbackIndexRef.current + 1) % schedule.length;
                advance();
            }, nextDelay);
        };

        // Start the animation loop
        chordStartTimeRef.current = performance.now();
        animationFrameRef.current = requestAnimationFrame(animatePlayhead);

        advance();
    }, [generation, outputType, tempo, isLooping, midiOutputId, midiChannel]);

    return {
        isLooping,
        chordIndicator,
        playbackProgress,
        startLoop,
        stopLoop,
        synth: synthRef.current,
        setChordIndicator,
    };
}
