// ValidationUtils.ts
// Shared validation helpers for note names, chord patterns, and durations

import { CHORD_FORMULAS } from './MidiGenerator';

export const ALL_POSSIBLE_NOTE_NAMES_FOR_VALIDATION = [
    'C', 'C#', 'Db',
    'D', 'D#', 'Eb',
    'E', 'Fb',
    'F', 'F#', 'Gb',
    'G', 'G#', 'Ab',
    'A', 'A#', 'Bb',
    'B', 'Cb'
];

export const VALID_DURATION_CODES = [
    'w', '1', 'h', '2', 'dh', 'd2',
    'q', '4', 'dq', 'd4', 'e', '8',
    'de', 'd8', 's', '16'
];

export function generateValidChordPattern(): RegExp {
    const notePattern = ALL_POSSIBLE_NOTE_NAMES_FOR_VALIDATION.join('|');
    const qualitiesPattern = Object.keys(CHORD_FORMULAS)
        .filter(q => q)
        .map(q => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .sort((a, b) => b.length - a.length)
        .join('|');

    // Accept optional quality and optional "/Bass" (e.g., Cmaj7/G)
    // Final pattern: ^(Note)(OptionalQuality)?(?:/(Note))?$
    return new RegExp(`^(${notePattern})(?:(${qualitiesPattern}))?(?:\\/(${notePattern}))?$`, 'i');
}