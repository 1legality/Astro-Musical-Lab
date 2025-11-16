// MidiGenerator.ts
import MidiWriter from 'midi-writer-js';

// Keep NoteData interface accessible or redefine if needed
export interface NoteData {
    midiNote: number;
    startTimeTicks: number;
    durationTicks: number;
    velocity: number;
}

// --- Constants (can be private static or module-level) ---
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const INTERVALS = {
    P1: 0,
    m2: 1,
    M2: 2,
    m3: 3,
    M3: 4,
    P4: 5,
    A4: 6,
    d5: 6,
    P5: 7,
    A5: 8,
    m6: 8,
    M6: 9,
    d7: 9,
    m7: 10,
    M7: 11,
    P8: 12,
    m9: 13,
    M9: 14,
    A9: 15,
    P11: 17,
    A11: 18,
    m13: 20,
    M13: 21
};
export const CHORD_FORMULAS: Record<string, number[]> = {
    // --- Basic Triads ---
    '': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5], // Default to major
    'maj': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5],
    'M': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5], // Alias for major
    'm': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5],
    'min': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5], // Alias for minor
    'dim': [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5],
    'aug': [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5],
    '+': [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5], // Alias for augmented

    // --- Suspended Chords ---
    'sus4': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5],
    'sus': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5], // Alias for sus4
    'sus2': [INTERVALS.P1, INTERVALS.M2, INTERVALS.P5],

    // --- Single note (root only) ---
    '1': [INTERVALS.P1], 

    // --- Power Chord ---
    '5': [INTERVALS.P1, INTERVALS.P5],

    // --- "Add" Chords (Triads + added note, no 7th) ---
    'add2': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M2], // Major add 2 (often same sound as add9)
    '(add2)': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M2], // Alias for add2 with parentheses
    'add4': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P4, INTERVALS.P5], // Major add 4
    '(add4)': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P4, INTERVALS.P5], // Alias for add4 with parentheses
    'add9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M9], // Major add 9
    '(add9)': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M9], // Alias for add9 with parentheses
    'm(add2)': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M2], // Minor add 2
    'm(add4)': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P4, INTERVALS.P5], // Minor add 4
    'm(add9)': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M9], // Minor add 9
    'madd2': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M2], // Alias for m(add2)
    'madd9': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M9], // Alias for m(add9)
    // --- Popular additional chords ---
    'sus2add9': [INTERVALS.P1, INTERVALS.M2, INTERVALS.P5, INTERVALS.M9], // Sus2 with added 9th
    'm7add11': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.P11], // Minor 7th add 11
    'maj7add13': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M13], // Major 7th add 13
    '7b13': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.m13], // Dominant 7th flat 13
    '7sus2': [INTERVALS.P1, INTERVALS.M2, INTERVALS.P5, INTERVALS.m7], // Dominant 7th sus2
    '7sus2sus4': [INTERVALS.P1, INTERVALS.M2, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7], // Dominant 7th sus2sus4
    '7#11': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.A4], // Dominant 7th sharp 11
    'mMaj9': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9], // Alias for m(maj9)

    // --- Sixth Chords ---
    '6': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M6], // Major 6th
    'maj6': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M6], // Alias for Major 6th
    'm6': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M6], // Minor 6th
    'min6': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M6], // Alias for Minor 6th
    '6/9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M6, INTERVALS.M9], // 6th chord with added 9th
    'm6/9': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M6, INTERVALS.M9], // Minor 6th chord with added 9th

    // --- Seventh Chords ---
    '7': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7], // Dominant 7th
    'maj7': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7], // Major 7th
    'M7': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7], // Alias for Major 7th
    'm7': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7], // Minor 7th
    'min7': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7], // Alias for Minor 7th
    'm(maj7)': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7], // Minor-Major 7th
    'mM7': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7], // Alias for Minor-Major 7th
    'dim7': [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5, INTERVALS.d7], // Diminished 7th (º7)
    'm7b5': [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5, INTERVALS.m7], // Half-diminished 7th (ø7)

    // --- Ninth Chords ---
    '9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9], // Dominant 9th
    'maj9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9], // Major 9th
    'M9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9], // Alias for Major 9th
    'm9': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9], // Minor 9th
    'min9': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9], // Alias for Minor 9th
    'm(maj9)': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9], // Minor-Major 9th
    'mM9': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9], // Alias for Minor-Major 9th

    // --- Eleventh Chords ---
    // Note: Dominant 11 chords often omit the 3rd [P1, P5, m7, M9, P11]
    // Note: Major 11 chords often omit 3rd or 5th [P1, P5, M7, M9, P11] or [P1, M7, M9, P11]
    '11': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.P11], // Dominant 11th (full theory)
    'maj11': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.P11], // Major 11th (full theory)
    'M11': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.P11], // Alias Major 11th
    'm11': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.P11], // Minor 11th
    'min11': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.P11], // Alias Minor 11th
    'm(maj11)': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.P11], // Minor-Major 11th
    'mM11': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.P11], // Alias Minor-Major 11th

    // --- Thirteenth Chords ---
    // Note: 13 chords often omit the 11th and sometimes the 5th.
    '13': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13], // Dominant 13th (omits 11th)
    'maj13': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.M13], // Major 13th (omits 11th)
    'M13': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.M13], // Alias Major 13th
    'm13': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13], // Minor 13th (omits 11th)
    'min13': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13], // Alias Minor 13th
    'm(maj13)': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.M13], // Minor-Major 13th
    'mM13': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.M13], // Alias Minor-Major 13th

    // --- Altered/Extended Dominants & Others ---
    '7b5': [INTERVALS.P1, INTERVALS.M3, INTERVALS.d5, INTERVALS.m7],
    '7#5': [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5, INTERVALS.m7], // Dominant 7th Augmented 5th
    '7aug': [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5, INTERVALS.m7], // Alias for 7#5
    '7b9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.m9],
    '7#9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.A9],
    '7(#11)': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.A4], // Often omits 5th: [P1, M3, m7, A4/A11]
    '9b5': [INTERVALS.P1, INTERVALS.M3, INTERVALS.d5, INTERVALS.m7, INTERVALS.M9],
    '9#5': [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5, INTERVALS.m7, INTERVALS.M9],
    '13b9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.m9, INTERVALS.M13],
    '13#9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.A9, INTERVALS.M13],
    '13(#11)': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.A4, INTERVALS.M13], // Original
    '7b9b5': [INTERVALS.P1, INTERVALS.M3, INTERVALS.d5, INTERVALS.m7, INTERVALS.m9],
    '7b9#5': [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5, INTERVALS.m7, INTERVALS.m9],
    '7#9b5': [INTERVALS.P1, INTERVALS.M3, INTERVALS.d5, INTERVALS.m7, INTERVALS.A9],
    '7#9#5': [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5, INTERVALS.m7, INTERVALS.A9],
    '7alt': [INTERVALS.P1, INTERVALS.M3, INTERVALS.m7, INTERVALS.m9, INTERVALS.A5], // Common Altered Dominant voicing (Root, 3, b7, b9, #5) - can vary!

    // --- Altered/Extended Major/Minor & Others ---
    'maj7(#11)': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.A4], // Major 7 sharp 11
    'M7#11': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.A4], // Alias
    'maj9(#11)': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.A4], // Major 9 sharp 11
    'M9#11': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.A4], // Alias
    'm7(#11)': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.A4], // Minor 7 sharp 11
    'm9(#11)': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.A4], // Minor 9 sharp 11

    // --- Suspended Variants ---
    '7sus4': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7],
    '7sus': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7], // Alias
    '9sus4': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9],
    '9sus': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9], // Alias
    '13sus4': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13], // Original
    '13sus': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13], // Alias
    'maj7sus4': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.M7], // Major 7 sus 4
    'M7sus': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5, INTERVALS.M7], // Alias
};

export const TPQN = 128; // MIDI Writer JS default ticks per quarter note
const OCTAVE_ADJUSTMENT_THRESHOLD = 6; // Adjust if average pitch is > 6 semitones (half octave) away from target

// Define the possible output types
export type OutputType = 'chordsOnly' | 'chordsAndBass' | 'bassOnly' | 'bassAndFifth';
export type InversionType = 'none' | 'first' | 'smooth' | 'pianist' | 'open' | 'spread' | 'cocktail';

export interface MidiGenerationOptions {
    progressionString: string;
    outputFileName?: string; // Optional, provide default
    outputType: OutputType;
    inversionType: InversionType;
    baseOctave: number;
    chordDurationStr?: string; // Optional, provide default
    tempo: number;
    velocity: number;
    totalSteps?: number;
    totalBars?: number;
}

export interface MidiGenerationResult {
    notesForPianoRoll: NoteData[];
    midiBlob: Blob;
    finalFileName: string;
    chordDetails: ChordGenerationData[]; // New property to store detailed chord information
}

// Intermediate structure to hold chord data during generation
export interface ChordGenerationData {
    symbol: string;
    startTimeTicks: number;
    durationTicks: number;
    initialVoicing: number[]; // Voicing after root/smooth logic
    adjustedVoicing: number[]; // Voicing after octave adjustment
    rootNoteName: string;
    isValid: boolean;
    calculatedBassNote: number | null; // Store the calculated bass note
    explicitBassRoot?: string; // NEW: stores explicit bass root if user wrote C/G
}

export class MidiGenerator {

    private normalizeNoteName(note: string): string {
        const name = note.toUpperCase();
        switch (name) {
            // Flats are converted to sharps here!
            case 'DB': return 'C#';
            case 'EB': return 'D#';
            case 'FB': return 'E'; // Special case
            case 'GB': return 'F#';
            case 'AB': return 'G#';
            case 'BB': return 'A#';
            // Sharps that wrap around
            case 'E#': return 'F';
            case 'B#': return 'C';
            default: return name; // Natural notes or already sharp notes pass through
        }
    }

    private getNoteIndex(note: string): number {
    // Normalize flats to sharps first (Db -> C#, Gb -> F#, etc.)
    const normalizedNote = this.normalizeNoteName(note);
    // Find the index in the CORRECTED 12-tone array
    const index = NOTES.indexOf(normalizedNote);
    if (index === -1) {
         // Handle cases like E# (-> F) or B# (-> C) which might fail after normalization if not careful
         // A more robust approach might be a direct map:
         // throw new Error(`Invalid or unhandled note name after normalization: ${normalizedNote} (from ${note})`);
         // Let's try re-normalizing for edge cases like B#:
         const reNormalized = this.normalizeNoteName(normalizedNote); // e.g., B# -> C
         const reIndex = NOTES.indexOf(reNormalized);
         if (reIndex === -1) {
             throw new Error(`Invalid note name: ${note} -> ${normalizedNote} -> ${reNormalized}`);
         }
         return reIndex;

    }
    return index;
    }

    private getMidiNote(noteName: string, octave: number): number {
        const noteIndex = this.getNoteIndex(noteName);
        const midiVal = 12 * (octave + 1) + noteIndex;
        // Ensure note is within reasonable bounds, though final check happens later
        if (midiVal < 0 || midiVal > 127) {
             console.warn(`Calculated MIDI note ${midiVal} for ${noteName}${octave} is outside the standard 0-127 range.`);
             // Return a value that will likely be filtered out later, or clamp/throw error
             return midiVal; // Keep the value for now, filter later
        }
        return midiVal;
    }

    /**
     * Converts a duration input string (bars, letter codes, or T-codes) to MIDI ticks.
     * @param durationInput - The duration string (e.g., "0.5", "1", "q", "8", "T128").
     *                        If undefined or empty, defaults to 1 bar.
     * @returns The duration in MIDI ticks.
     */
    private getDurationTicks(durationInput?: string): number {
        const beatsPerBar = 4; // Assuming 4/4 time signature
        if (!durationInput || durationInput.trim() === "") {
            return TPQN * beatsPerBar; // Default to 1 bar (4 beats)
        }

        const input = durationInput.trim();

        // Try parsing as a number first (assumed to be in bars)
        const numericBarValue = parseFloat(input);
        if (!isNaN(numericBarValue) && numericBarValue > 0) {
            return TPQN * beatsPerBar * numericBarValue;
        }

        // Removed all shorthand and descriptive cases, keeping only decimal values
        switch (input.toLowerCase()) {
            case '0.25': return TPQN / 4;   // 0.25 bars
            case '0.5': return TPQN / 2;    // 0.5 bars
            case '0.75': return TPQN * 0.75; // 0.75 bars
            case '1': return TPQN;        // 1 bar
            case '1.5': return TPQN * 1.5; // 1.5 bars
            case '2': return TPQN * 2;    // 2 bars
            case '3': return TPQN * 3;   // 3 bars
            case '4': return TPQN * 4;    // 4 bars
            default:
                // Check for T-codes (absolute ticks)
                if (/^t\d+$/i.test(input)) {
                    return parseInt(input.substring(1), 10);
                }
                console.warn(`Unknown duration: "${input}". Defaulting to 1 bar (${TPQN * beatsPerBar} ticks).`);
                return TPQN * beatsPerBar; // Default to 1 bar
        }
    }

    /**
     * Generates all possible inversions for a given set of root-position chord notes.
     * @param rootPositionNotes - Array of MIDI notes in root position, sorted low to high.
     * @returns An array of voicings (each an array of MIDI notes), starting with root position.
     */
    private generateInversions(rootPositionNotes: number[]): number[][] {
        if (rootPositionNotes.length <= 1) {
            return [rootPositionNotes]; // No inversions possible/needed
        }
        const allInversions: number[][] = [];
        let currentVoicing = [...rootPositionNotes]; // Start with root position

        // Generate N inversions (including root position) for an N-note chord
        for (let i = 0; i < rootPositionNotes.length; i++) {
            // Ensure it's sorted before adding
            currentVoicing.sort((a, b) => a - b);
            allInversions.push([...currentVoicing]); // Add a copy

            // Prepare next inversion (if not the last one)
            if (i < rootPositionNotes.length - 1) {
                const lowestNote = currentVoicing.shift(); // Remove lowest
                if (lowestNote !== undefined) {
                    currentVoicing.push(lowestNote + 12); // Add it back an octave higher
                }
            }
        }
        return allInversions;
    }

    /**
     * Calculates a distance metric between two chord voicings to estimate smoothness.
     * A lower score means a smoother transition.
     * This simple version sums the absolute MIDI pitch differences of corresponding notes.
     * It penalizes differences in the number of notes.
     * @param voicing1 - First voicing (array of MIDI notes, sorted).
     * @param voicing2 - Second voicing (array of MIDI notes, sorted).
     * @returns A numeric score representing the distance.
     */
    private calculateVoicingDistance(voicing1: number[], voicing2: number[]): number {
        const sorted1 = [...voicing1].sort((a, b) => a - b);
        const sorted2 = [...voicing2].sort((a, b) => a - b);
        let totalDistance = 0;
        const minLength = Math.min(sorted1.length, sorted2.length);
        const maxLength = Math.max(sorted1.length, sorted2.length);
        for (let i = 0; i < minLength; i++) { totalDistance += Math.abs(sorted1[i] - sorted2[i]); }
        const noteCountDifference = maxLength - minLength;
        totalDistance += noteCountDifference * 6; // Penalty factor
        return totalDistance;
    }

    /**
     * Resolve semitone clashes within a voicing by octave-shifting the clashing tone
     * that yields the smaller distance to the previous chord.
     * Mirrors the Python algorithm's approach.
     */
    private resolveSemitoneClashes(voicing: number[], previousChordNotes: number[]): number[] {
        if (!voicing || voicing.length < 2) {
            return [...voicing].sort((a, b) => a - b);
        }

        let resolved = [...voicing].sort((a, b) => a - b);
        while (true) {
            let clashFound = false;
            // iterate from high to low indices (checking adjacent pairs)
            for (let i = resolved.length - 2; i >= 0; i--) {
                if (resolved[i + 1] - resolved[i] === 1) { // semitone clash
                    const optionA = [...resolved];
                    optionA[i + 1] = optionA[i + 1] + 12; // move higher note up an octave

                    const optionB = [...resolved];
                    optionB[i] = optionB[i] - 12; // move lower note down an octave

                    const distA = this.calculateVoicingDistance(previousChordNotes, optionA);
                    const distB = this.calculateVoicingDistance(previousChordNotes, optionB);
                    resolved = distA <= distB ? optionA : optionB;
                    clashFound = true;
                    break; // restart scanning after applying a fix
                }
            }
            if (!clashFound) break;
        }
        return resolved.sort((a, b) => a - b);
    }

    /**
     * Adjusts chord voicings to be closer to the target octave.
     * @param voicings - Array of chord voicings (arrays of MIDI notes).
     * @param baseOctave - The desired base octave (e.g., 3, 4).
     * @returns A new array with adjusted voicings.
     */
    private adjustVoicingsToTargetOctave(voicings: number[][], baseOctave: number): number[][] {
        if (!voicings || voicings.length === 0) {
            return [];
        }

        // Target the C note in the base octave as the center
        const targetCenterPitch = this.getMidiNote('C', baseOctave); // e.g., C4 = 60

        return voicings.map(voicing => {
            if (!voicing || voicing.length === 0) {
                return []; // Keep empty voicings as they are
            }

            // Calculate average pitch of the current voicing
            const sum = voicing.reduce((acc, note) => acc + note, 0);
            const averagePitch = sum / voicing.length;

            // Calculate difference from target center and determine octave shift needed
            const difference = averagePitch - targetCenterPitch;
            // Only adjust if the average is significantly far from the target
            if (Math.abs(difference) > OCTAVE_ADJUSTMENT_THRESHOLD) {
                const octaveShift = Math.round(difference / 12); // Number of octaves to shift
                if (octaveShift !== 0) {
                    const semitoneShift = octaveShift * -12; // Shift in opposite direction of difference
                    const adjustedVoicing = voicing.map(note => note + semitoneShift);

                    // Basic check to prevent shifting notes completely out of MIDI range
                    const minNote = Math.min(...adjustedVoicing);
                    const maxNote = Math.max(...adjustedVoicing);
                    if (minNote >= 0 && maxNote <= 127) {
                        // console.log(`Adjusting voicing avg ${averagePitch.toFixed(1)} towards ${targetCenterPitch} by ${semitoneShift} semitones.`);
                        return adjustedVoicing.sort((a, b) => a - b);
                    } else {
                        // console.log(`Skipping adjustment for voicing avg ${averagePitch.toFixed(1)} - shift ${semitoneShift} would go out of range.`);
                        return voicing.sort((a, b) => a - b); // Keep original if shift goes out of bounds, but ensure sorted
                    }
                }
            }
            // No significant shift needed, return original voicing (ensure sorted)
            return voicing.sort((a, b) => a - b);
        });
    }

    /**
     * Calculates the appropriate bass note MIDI value for a given chord, prioritizing smooth transitions
     * and ensuring it's distinct from the main chord voicing when necessary.
     * @param chordData - The data for the current chord.
     * @param baseOctave - The target base octave for the *chords*.
     * @param inversionType - The type of inversion used for the chord voicing.
     * @param previousBassNote - The MIDI value of the previous bass note, if available.
     * @param outputType - The requested output type.
     * @param chordVoicing - The actual MIDI notes of the chord's adjusted voicing.
     * @returns The MIDI note number for the bass note, or null if none could be determined.
     */
    private calculateBassNote(
        chordData: ChordGenerationData,
        baseOctave: number,
        inversionType: InversionType,
        previousBassNote: number | null,
        outputType: OutputType,
        chordVoicing: number[] // Pass the actual chord voicing
    ): number | null {
        if (!chordData.isValid || !chordData.rootNoteName) {
            return null;
        }

        // --- Smooth Bass Logic (Prioritize if requested) ---
        if (inversionType === 'smooth' && previousBassNote !== null) {
            const potentialBassNotes = [];
            // Check octaves around the previous bass note's estimated octave
            const prevOctave = Math.floor((previousBassNote - 12) / 12); // Estimate octave
            for (let octave = prevOctave - 1; octave <= prevOctave + 1; octave++) {
                const bassNote = this.getMidiNote(chordData.rootNoteName, octave);
                if (bassNote >= 0 && bassNote <= 127) {
                    potentialBassNotes.push(bassNote);
                }
            }
            if (potentialBassNotes.length > 0) {
                const chosenBassNote = potentialBassNotes.reduce((closest, note) =>
                    Math.abs(note - previousBassNote) < Math.abs(closest - previousBassNote) ? note : closest
                );
                // For smooth, we accept the closest, even if it might coincide with a chord tone sometimes
                if (chosenBassNote >= 0 && chosenBassNote <= 127) {
                    return chosenBassNote;
                }
                // Fall through to default calculation if smoothing failed to find a valid note
            }
        }

        // --- Default/Fallback Bass Note Calculation (Non-Smooth or Failed Smooth) ---
        const defaultBassOctave = baseOctave - 1; // Default target: one octave below chord base
        let chosenBassNote = this.getMidiNote(chordData.rootNoteName, defaultBassOctave);

        // Check if the default bass note is *in* the chord voicing (and the voicing isn't empty)
        if (chordVoicing.length > 0 && chordVoicing.includes(chosenBassNote)) {
            const lowerBassNote = this.getMidiNote(chordData.rootNoteName, defaultBassOctave - 1); // Try one octave lower
            // Use the lower note only if it's valid and *different* from the original attempt
            if (lowerBassNote >= 0 && lowerBassNote <= 127 && lowerBassNote !== chosenBassNote) {
                // console.log(`Bass note ${chosenBassNote} for ${chordData.symbol} coincided with chord voicing. Using lower octave: ${lowerBassNote}`);
                chosenBassNote = lowerBassNote;
            } else {
                // console.log(`Bass note ${chosenBassNote} for ${chordData.symbol} coincided with chord voicing. Lower octave ${lowerBassNote} is invalid or same. Keeping original.`);
                // Stick with the original calculated note, even if it's in the chord, if the lower octave is invalid/same.
            }
        }

        // --- Final Range Check ---
        if (chosenBassNote < 0 || chosenBassNote > 127) {
            console.warn(`Calculated bass note ${chosenBassNote} for "${chordData.symbol}" is out of range. Trying higher octave.`);
            // As a last resort, try the octave *above* the default target if the primary attempts failed
            const higherBassNote = this.getMidiNote(chordData.rootNoteName, defaultBassOctave + 1);
            if (higherBassNote >= 0 && higherBassNote <= 127 && !chordVoicing.includes(higherBassNote)) {
                return higherBassNote;
            }
            console.error(`Could not determine a valid bass note for "${chordData.symbol}".`);
            return null; // Give up if all attempts fail
        }

        return chosenBassNote;
    }

    // Helper to produce a Blob from the writer.buildFile() result in a TypeScript-friendly way
    private buildMidiBlob(midiDataBytes: any): Blob {
        // midi-writer-js may return a Uint8Array or another binary-like type.
        if (typeof Uint8Array !== 'undefined' && midiDataBytes instanceof Uint8Array) {
            // Create a proper Uint8Array copy (ensures underlying buffer is a standard ArrayBuffer)
            const copy = new Uint8Array(midiDataBytes.length);
            copy.set(midiDataBytes);
            return new Blob([copy], { type: 'audio/midi' });
        }
        // If it's an ArrayBuffer or ArrayBufferView, pass it directly
        if (midiDataBytes && (midiDataBytes instanceof ArrayBuffer || ArrayBuffer.isView(midiDataBytes))) {
            return new Blob([midiDataBytes as any], { type: 'audio/midi' });
        }
        // Fallback: convert to string or wrap as-is
        try {
            return new Blob([midiDataBytes as any], { type: 'audio/midi' });
        } catch (e) {
            // Final fallback: stringify
            return new Blob([String(midiDataBytes)], { type: 'text/plain' });
        }
    }

    /**
     * Generates MIDI data and note array from provided options.
     * @param options - The settings for MIDI generation.
     * @returns Object containing notesForPianoRoll, midiBlob, and finalFileName, or throws an error.
     */
    public generate(options: MidiGenerationOptions): MidiGenerationResult {
        const {
            progressionString,
            outputFileName,
            outputType,
            inversionType,
            baseOctave,
            chordDurationStr,
            tempo,
            velocity
        } = options;

        if (!progressionString || progressionString.trim() === '') {
            throw new Error("Chord progression cannot be empty.");
        }

        let finalFileName;
        if (outputFileName) {
            finalFileName = outputFileName.endsWith('.mid') ? outputFileName : `${outputFileName}.mid`;
        } else {
            const sanitizedProgressionString = progressionString.replace(/\s+/g, '_').replace(/:/g, '-');
            finalFileName = `${sanitizedProgressionString}_${String(outputType)}_${String(inversionType)}.mid`;
        }

        // Only declare totalSteps and totalBars once, at the top
        const totalSteps = options.totalSteps || 16;
        const totalBars = options.totalBars || 4;

        const chordEntries = progressionString.trim().split(/\s+/); // e.g., ["Am:0.5", "G:1", "C/G", "R:1"]
        // Capture: root, quality/extensions (not including slash), optional "/bassRoot"
        const chordRegex = /^([A-G][#b]?)([^\/]*)(?:\/([A-G][#b]?))?$/;

        const generatedChords: ChordGenerationData[] = [];
        let currentTick = 0;
        let previousChordVoicing: number[] | null = null;
        let previousBassNote: number | null = null; // Track previous bass note

        // --- Step 1: Generate Initial Voicings (Root or Smoothed) ---
        for (const entry of chordEntries) {
            if (!entry) continue;

            const parts = entry.split(':');
            const chordSymbol = parts[0];
            // Use duration from entry, or fallback to chordDurationStr, or undefined
            const durationString = parts.length > 1 ? parts[1] : chordDurationStr;
            const currentChordDurationTicks = this.getDurationTicks(durationString);

            // --- REST HANDLING ---
            if (chordSymbol.toUpperCase() === 'R') {
                // Treat as a rest: no notes, just advance time
                generatedChords.push({
                    symbol: 'R',
                    startTimeTicks: currentTick,
                    durationTicks: currentChordDurationTicks,
                    initialVoicing: [],
                    adjustedVoicing: [],
                    rootNoteName: '',
                    isValid: false,
                    calculatedBassNote: null
                });
                currentTick += currentChordDurationTicks;
                previousChordVoicing = null;
                continue;
            }

            const match = chordSymbol.match(chordRegex);
            let chordData: ChordGenerationData = {
                symbol: chordSymbol,
                startTimeTicks: currentTick,
                durationTicks: currentChordDurationTicks,
                initialVoicing: [],
                adjustedVoicing: [],
                rootNoteName: '',
                isValid: false,
                calculatedBassNote: null, // Initialize bass note
                explicitBassRoot: undefined
            };

            if (!match) {
                console.warn(`Could not parse chord symbol: "${chordSymbol}" in entry "${entry}". Skipping.`);
                generatedChords.push(chordData);
                currentTick += currentChordDurationTicks;
                previousChordVoicing = null;
                continue;
            }

            const rootNoteName = match[1];
            let qualityAndExtensions = (match[2] || '').trim();
            const explicitBass = match[3] ? match[3].trim() : undefined;
            chordData.rootNoteName = rootNoteName;
            if (explicitBass) chordData.explicitBassRoot = explicitBass;

            try {
                const rootMidi = this.getMidiNote(rootNoteName, baseOctave);
                let formulaIntervals = CHORD_FORMULAS[qualityAndExtensions];

                if (formulaIntervals === undefined) {
                    if (qualityAndExtensions === '') {
                        formulaIntervals = CHORD_FORMULAS['maj'];
                        qualityAndExtensions = 'maj';
                    } else {
                        console.warn(`Chord quality "${qualityAndExtensions}" not found for "${chordSymbol}". Defaulting to major triad.`);
                        formulaIntervals = CHORD_FORMULAS['maj'];
                    }
                }

                let rootPositionNotes = formulaIntervals.map(intervalSemitones => rootMidi + intervalSemitones)
                    .sort((a, b) => a - b);

                let currentChordVoicing = [...rootPositionNotes];

                // Apply inversion logic based on type
                if (inversionType === 'first' && currentChordVoicing.length > 1) {
                    const lowestNote = currentChordVoicing.shift();
                    if (lowestNote !== undefined) { currentChordVoicing.push(lowestNote + 12); }
                    currentChordVoicing.sort((a, b) => a - b);
                } else if (inversionType === 'smooth') {
                    if (!previousChordVoicing && currentChordVoicing.length > 1) {
                        // For the very first chord, gently align to base octave
                        currentChordVoicing = this.adjustVoicingsToTargetOctave([currentChordVoicing], baseOctave)[0];
                    } else if (previousChordVoicing && currentChordVoicing.length > 1) {
                        // Improved smooth voice leading: average-align candidates and resolve clashes
                        const targetVoicing = [...previousChordVoicing].sort((a, b) => a - b);
                        const targetAverage = targetVoicing.reduce((acc, n) => acc + n, 0) / targetVoicing.length;

                        const possibleInversions = this.generateInversions(rootPositionNotes);
                        let bestVoicing = [...currentChordVoicing];
                        let minDistance = Infinity;

                        for (const inversion of possibleInversions) {
                            const invAvg = inversion.reduce((acc, n) => acc + n, 0) / inversion.length;
                            const octaveDifference = Math.round((targetAverage - invAvg) / 12);
                            let candidate = inversion.map(n => n + octaveDifference * 12);

                            // Resolve semitone clashes against the previous chord context
                            candidate = this.resolveSemitoneClashes(candidate, targetVoicing);

                            const distance = this.calculateVoicingDistance(targetVoicing, candidate);
                            if (distance < minDistance) {
                                minDistance = distance;
                                bestVoicing = candidate;
                            }
                        }

                        currentChordVoicing = bestVoicing.sort((a, b) => a - b);
                    } else {
                        // Handle single-note chords or missing previous voicing
                        currentChordVoicing = this.adjustVoicingsToTargetOctave([currentChordVoicing], baseOctave)[0];
                    }
                } else if (inversionType === 'pianist') {
                    // Pianist mode with basic voice anchoring
                    const root = currentChordVoicing[0];
                    const topVoices = currentChordVoicing.slice(1).map(n => n - 12);
                    const SPREAD_BASE = 12; 

                    if (previousChordVoicing && topVoices.length > 1) {
                        // Generate inversions of top voices only
                        const possibleVoicings = this.generateInversions(topVoices);
                        let bestTopVoicing = topVoices;
                        let minDistance = Infinity;

                        for (const inversion of possibleVoicings) {
                            const spreadInversion = inversion.map((note, i) => note + SPREAD_BASE + i * 2);
                            const testVoicing = [root, ...spreadInversion];
                            const distance = this.calculateVoicingDistance(previousChordVoicing, testVoicing);
                            if (distance < minDistance) {
                                minDistance = distance;
                                bestTopVoicing = spreadInversion;
                            }
                        }
                        currentChordVoicing = [root, ...bestTopVoicing].sort((a, b) => a - b);
                    } 
                    else 
                    {
                        const spreadTop = topVoices.map((note, i) => note + SPREAD_BASE + i * 2);
                        currentChordVoicing = [root, ...spreadTop].sort((a, b) => a - b);
                    }
                } else if (inversionType === 'open') {
                    // Open voicing: Drop the 3rd or 5th down an octave
                    if (currentChordVoicing.length > 2) {
                        currentChordVoicing[1] -= 12; // Drop the 3rd down an octave
                        currentChordVoicing.sort((a, b) => a - b);
                    }
                } else if (inversionType === 'spread') {
                    // Spread voicing: 3rds and 7ths spread across two octaves
                    const root = currentChordVoicing[0];
                    const spreadNotes = currentChordVoicing.slice(1).map((note, i) => note + 12 * (i % 2));
                    currentChordVoicing = [root, ...spreadNotes].sort((a, b) => a - b);
                } else if (inversionType === 'cocktail') {
                    // Cocktail voicing: Root+7th in left hand, upper melody tone
                    const root = currentChordVoicing[0];
                    const seventh = currentChordVoicing.length > 3 ? currentChordVoicing[3] : currentChordVoicing[1];
                    const melody = currentChordVoicing[currentChordVoicing.length - 1];
                    currentChordVoicing = [root, seventh, melody].sort((a, b) => a - b);
                }

                chordData.initialVoicing = [...currentChordVoicing]; // Store the result of inversion/smoothing
                chordData.isValid = true;
                previousChordVoicing = [...currentChordVoicing]; // Update previous for next iteration's smoothing

            } catch (error: any) {
                console.error(`Error processing chord "${chordSymbol}" in entry "${entry}": ${error.message}.`);
                previousChordVoicing = null;
                // chordData remains isValid = false
            }

            generatedChords.push(chordData);
            currentTick += currentChordDurationTicks;
        } // End Step 1 loop


        // --- Step 2: Apply Post-Processing Octave Adjustment (if not already done during 'smooth') ---
        // Note: 'smooth' now adjusts during the smoothing process itself.
        // We still need to adjust 'none' and 'first' inversions here.
        let finalVoicings: number[][];
        if (inversionType === 'none' || inversionType === 'first') {
            const initialVoicings = generatedChords.map(cd => cd.initialVoicing);
            finalVoicings = this.adjustVoicingsToTargetOctave(initialVoicings, baseOctave);
        } else { // 'smooth' voicings are already adjusted relative to the previous chord during step 1
            finalVoicings = generatedChords.map(cd => cd.initialVoicing); // Use the already-adjusted initialVoicing
        }

        // Store final voicings back into generatedChords and calculate bass notes
        generatedChords.forEach((cd, index) => {
            // Ensure the final voicing is sorted
            cd.adjustedVoicing = (finalVoicings[index] || []).sort((a, b) => a - b);
            // Calculate and store the bass note needed for Step 3
            if (cd.isValid) {
                // If an explicit bass root (slash chord) was provided, honor it (try preferred octaves).
                if (cd.explicitBassRoot) {
                    let explicitMidi: number | null = null;
                    const preferredOctaves = [baseOctave - 1, baseOctave - 2, baseOctave]; // try these in order
                    for (const oct of preferredOctaves) {
                        try {
                            const m = this.getMidiNote(cd.explicitBassRoot, oct);
                            if (m >= 0 && m <= 127) {
                                // prefer an octave that doesn't exactly duplicate chord voicing
                                if (!cd.adjustedVoicing.includes(m)) { explicitMidi = m; break; }
                                if (explicitMidi === null) explicitMidi = m; // fallback if all collide
                            }
                        } catch (e) {
                            // ignore and try next octave
                        }
                    }
                    cd.calculatedBassNote = explicitMidi;
                    previousBassNote = cd.calculatedBassNote;
                } else {
                    cd.calculatedBassNote = this.calculateBassNote(
                        cd,
                        baseOctave,
                        inversionType,
                        previousBassNote,
                        outputType,
                        cd.adjustedVoicing // <-- Pass the adjusted voicing here
                    );
                    previousBassNote = cd.calculatedBassNote; // Update previous bass note
                }
             }
         });


        // --- Step 3: Build MIDI Track and Piano Roll Data from Final Voicings ---
        const track = new MidiWriter.Track();
        track.setTempo(tempo);
        track.setTimeSignature(4, 4, 24, 8);
        const notesForPianoRoll: NoteData[] = [];

        for (const chordData of generatedChords) {
            if (!chordData.isValid) {
                // Add a rest if the chord symbol was invalid
                track.addEvent(new MidiWriter.NoteEvent({ pitch: [], wait: 'T' + chordData.durationTicks, duration: 'T0', velocity: 0 }));
                continue;
            }

            let eventMidiNotes: number[] = [];

            // Determine notes based on outputType
            switch (outputType) {
                case 'chordsOnly':
                    eventMidiNotes = [...chordData.adjustedVoicing];
                    break;
                case 'chordsAndBass':
                    eventMidiNotes = [...chordData.adjustedVoicing];
                    if (chordData.calculatedBassNote !== null && !eventMidiNotes.includes(chordData.calculatedBassNote)) {
                        eventMidiNotes.push(chordData.calculatedBassNote);
                    }
                    break;
                case 'bassOnly':
                    if (chordData.calculatedBassNote !== null) {
                        eventMidiNotes = [chordData.calculatedBassNote];
                    } else {
                        eventMidiNotes = []; // No valid bass note found
                        console.warn(`No valid bass note could be determined for "${chordData.symbol}". Adding rest.`);
                    }
                    break;
                case 'bassAndFifth':
                    if (chordData.calculatedBassNote !== null) {
                        const fifth = chordData.calculatedBassNote + 7;
                        eventMidiNotes = [chordData.calculatedBassNote];
                        if (fifth >= 0 && fifth <= 127) eventMidiNotes.push(fifth);
                    } else {
                        eventMidiNotes = [];
                        console.warn(`No valid bass note for "${chordData.symbol}". Adding rest.`);
                    }
                    break;
            }

            // Final filtering and sorting: ensure all notes are within MIDI range 0-127 and remove duplicates
            eventMidiNotes = eventMidiNotes
                .filter(note => note >= 0 && note <= 127)
                .sort((a, b) => a - b);
            eventMidiNotes = [...new Set(eventMidiNotes)]; // Remove duplicates after sorting

            if (eventMidiNotes.length > 0) {
                // Add notes to piano roll data
                eventMidiNotes.forEach(midiNote => {
                    notesForPianoRoll.push({
                        midiNote: midiNote,
                        startTimeTicks: chordData.startTimeTicks,
                        durationTicks: chordData.durationTicks,
                        velocity: velocity
                    });
                });
                // Add MIDI event
                track.addEvent(new MidiWriter.NoteEvent({
                    pitch: eventMidiNotes,
                    tick: chordData.startTimeTicks,
                    duration: 'T' + chordData.durationTicks,
                    velocity: velocity
                }));
            } else {
                // Add a rest if filtering removed all notes or if bassOnly had no note
                if (outputType !== 'bassOnly') { // Only warn if chords were expected
                     console.warn(`No valid MIDI notes remained for chord "${chordData.symbol}" after final filtering. Adding rest.`);
                }
                track.addEvent(new MidiWriter.NoteEvent({ pitch: [], wait: 'T' + chordData.durationTicks, duration: 'T0', velocity: 0 }));
            }
        } // End Step 3 loop


        // --- Step 4: Generate MIDI Blob ---
        const writer = new MidiWriter.Writer([track]);
        const midiDataBytes = writer.buildFile();
        const midiBlob = this.buildMidiBlob(midiDataBytes);

        return { notesForPianoRoll, midiBlob, finalFileName, chordDetails: generatedChords };
    }
}
